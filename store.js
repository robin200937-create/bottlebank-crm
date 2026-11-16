/* BottleBank CRM data layer.
   Live mode talks to Supabase (config.js). Demo mode (no config, or window.BB_DEMO) keeps data in this browser only. */
(function () {
  const listeners = new Set();
  const S = {
    mode: "live",
    me: null,            // { id, name, initials, role }
    people: [],          // all profiles
    venues: [],
    activities: [],
    online: navigator.onLine,
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    emit() { listeners.forEach(fn => { try { fn(); } catch (e) { console.error(e); } }); },
  };
  window.Store = S;

  const cfg = window.BB_CONFIG || {};
  const demoSeed = window.BB_DEMO;
  let sb = null;

  /* ---------------------------------------------------------------- demo */
  const DEMO_KEY = "bb-crm-demo-v1.1";
  const DEMO_PEOPLE = [
    { id: "kn", name: "Kanesh", initials: "KN", role: "admin" },
    { id: "tp", name: "Theepan", initials: "TP", role: "member" },
    { id: "sj", name: "Sanjay", initials: "SJ", role: "member" },
  ];
  function demoSave() {
    try { localStorage.setItem(DEMO_KEY, JSON.stringify({ venues: S.venues, activities: S.activities, me: S.me.id })); } catch (e) {}
  }
  function demoLoad() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(DEMO_KEY) || "null"); } catch (e) {}
    const src = saved || demoSeed;
    S.venues = src.venues.map(v => ({ ...v }));
    let n = 1;
    S.activities = src.activities.map(a => ({ id: a.id || n++, created_by: a.created_by || null, created_at: a.created_at || a.happened_on, ...a }));
    S.people = DEMO_PEOPLE;
    S.me = DEMO_PEOPLE.find(p => p.id === (saved && saved.me)) || DEMO_PEOPLE[0];
  }

  /* ---------------------------------------------------------------- live helpers */
  async function fetchAll(table, order) {
    const out = [];
    for (let from = 0; ; from += 1000) {
      let q = sb.from(table).select("*").range(from, from + 999);
      if (order) q = q.order(order[0], { ascending: order[1] });
      const { data, error } = await q;
      if (error) throw error;
      out.push(...data);
      if (data.length < 1000) break;
    }
    return out;
  }
  let reloadTimer = null;
  function scheduleReload() {
    clearTimeout(reloadTimer);
    reloadTimer = setTimeout(() => S.load().catch(console.error), 400);
  }

  /* ---------------------------------------------------------------- API */
  S.init = async function () {
    if (demoSeed || !cfg.url || !cfg.anonKey) {
      S.mode = "demo";
      if (!demoSeed) throw new Error("No Supabase details in config.js yet.");
      demoLoad();
      return true;
    }
    sb = window.supabase.createClient(cfg.url, cfg.anonKey, { auth: { persistSession: true, autoRefreshToken: true } });
    const { data } = await sb.auth.getSession();
    if (!data.session) return false;
    await afterSignIn(data.session.user);
    return true;
  };

  async function afterSignIn(user) {
    const { data: profs, error } = await sb.from("profiles").select("*");
    if (error) throw error;
    S.people = profs;
    S.me = profs.find(p => p.id === user.id);
    if (!S.me) throw new Error("This login isn't linked to a CRM profile yet. Ask Kanesh to add you (setup step 2).");
    await S.load();
    sb.channel("crm-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "venues" }, scheduleReload)
      .on("postgres_changes", { event: "*", schema: "public", table: "activities" }, scheduleReload)
      .subscribe();
    window.addEventListener("focus", scheduleReload);
  }

  S.signIn = async function (email, password) {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message === "Invalid login credentials" ? "That email and password don't match. Check both and try again." : error.message);
    await afterSignIn(data.user);
  };

  S.signOut = async function () {
    if (S.mode === "demo") return;
    await sb.auth.signOut();
    location.reload();
  };

  S.switchDemoUser = function (id) {
    S.me = S.people.find(p => p.id === id) || S.me;
    demoSave(); S.emit();
  };
  S.resetDemo = function () {
    try { localStorage.removeItem(DEMO_KEY); } catch (e) {}
    demoLoad(); S.emit();
  };

  S.load = async function () {
    if (S.mode === "demo") { S.emit(); return; }
    const [venues, acts] = await Promise.all([fetchAll("venues", ["id", true]), fetchAll("activities", ["happened_on", false])]);
    S.venues = venues; S.activities = acts;
    S.emit();
  };

  const VENUE_FIELDS = ["name","grp","city","area","address","venue_type","contact_name","contact_role","phone","email",
    "instagram","website","stage","priority","fit","current_system","owner","introducer","next_step","next_date","notes"];
  function pick(v) {
    const o = {};
    VENUE_FIELDS.forEach(k => { if (k in v) o[k] = v[k] === "" ? null : v[k]; });
    return o;
  }

  S.addVenue = async function (v) {
    const row = pick(v);
    if (S.mode === "demo") {
      const id = Math.max(0, ...S.venues.map(x => x.id)) + 1;
      const nv = { id, ...row, updated_at: new Date().toISOString() };
      S.venues.push(nv); demoSave(); S.emit(); return nv;
    }
    const { data, error } = await sb.from("venues").insert(row).select().single();
    if (error) throw error;
    S.venues.push(data); S.emit(); return data;
  };

  S.updateVenue = async function (id, patch) {
    const row = pick(patch);
    if (S.mode === "demo") {
      const v = S.venues.find(x => x.id === id); Object.assign(v, row, { updated_at: new Date().toISOString() });
      demoSave(); S.emit(); return v;
    }
    const { data, error } = await sb.from("venues").update(row).eq("id", id).select().single();
    if (error) throw error;
    const i = S.venues.findIndex(x => x.id === id); S.venues[i] = data; S.emit(); return data;
  };

  S.deleteVenue = async function (id) {
    if (S.me.role !== "admin") throw new Error("Only Kanesh can delete venues.");
    if (S.mode !== "demo") {
      const { error } = await sb.from("venues").delete().eq("id", id);
      if (error) throw error;
    }
    S.venues = S.venues.filter(x => x.id !== id);
    S.activities = S.activities.filter(a => a.venue_id !== id);
    if (S.mode === "demo") demoSave();
    S.emit();
  };

  S.addActivity = async function (a) {
    const row = { venue_id: a.venue_id, happened_on: a.happened_on, channel: a.channel, summary: a.summary, author: S.me.initials };
    if (S.mode === "demo") {
      const id = Math.max(0, ...S.activities.map(x => x.id)) + 1;
      const na = { id, ...row, created_by: S.me.id, created_at: new Date().toISOString() };
      S.activities.unshift(na); demoSave(); S.emit(); return na;
    }
    const { data, error } = await sb.from("activities").insert(row).select().single();
    if (error) throw error;
    S.activities.unshift(data); S.emit(); return data;
  };

  S.deleteActivity = async function (id) {
    if (S.mode !== "demo") {
      const { error } = await sb.from("activities").delete().eq("id", id);
      if (error) throw error;
    }
    S.activities = S.activities.filter(a => a.id !== id);
    if (S.mode === "demo") demoSave();
    S.emit();
  };

  S.canDeleteActivity = a => S.me && (S.me.role === "admin" || a.created_by === S.me.id);

  window.addEventListener("online", () => { S.online = true; S.emit(); scheduleReload(); });
  window.addEventListener("offline", () => { S.online = false; S.emit(); });
})();
