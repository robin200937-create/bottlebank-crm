/* BottleBank CRM: screens and interactions. Data comes from store.js (window.Store). */
(function () {
  const S = window.Store;

  /* ---------------------------------------------------------------- vocabulary */
  const STAGES = [
    { k: "lead",      t: "Not contacted",  lv: 0, d: "On our list. Nobody has reached out yet.", was: "New Lead · Introduction Needed" },
    { k: "contacted", t: "Contacted",      lv: 1, d: "We've reached out by email, WhatsApp, Instagram or a visit, and we're waiting for a reply.", was: "Introduction Made · SJ Introduced · Contact Established" },
    { k: "talking",   t: "In talks",       lv: 2, d: "They replied or we've spoken, and there's interest.", was: "Discovery Meeting · Potential" },
    { k: "meeting",   t: "Demo / meeting", lv: 3, d: "A demo or meeting is booked, or has happened.", was: "Demo Scheduled · Demo Completed" },
    { k: "quote",     t: "Quote sent",     lv: 4, d: "Quotation or proposal sent. Working out the terms.", was: "Proposal Sent · Negotiation · Verbal Agreement" },
    { k: "trial",     t: "Trial",          lv: 5, d: "On the 60-day free trial, or being set up.", was: "Won – Pending Onboarding · Onboarded" },
    { k: "client",    t: "Client",         lv: 6, d: "Live and paying.", was: "Live / Paying" },
  ];
  const SIDE = [
    { k: "hold",        t: "On hold",        lv: -1, d: "Paused for now. Follow up on the date set.", was: "On Hold" },
    { k: "lost",        t: "Not interested", lv: -1, d: "Said no, or not a fit for now.", was: "Lost" },
    { k: "unreachable", t: "Can't reach",    lv: -1, d: "Email bounced and no working number. Find another way in.", was: "" },
    { k: "closed",      t: "Venue closed",   lv: -1, d: "The venue has shut down.", was: "" },
  ];
  const ALL = [...STAGES, ...SIDE];
  const STAGE = Object.fromEntries(ALL.map(s => [s.k, s]));
  const ACTIVE = ["talking", "meeting", "quote", "trial", "hold"];
  const CHANNELS = ["Visit", "Call", "WhatsApp", "Email", "Instagram", "Meeting", "Demo", "Note"];
  const PEOPLE_FALLBACK = [{ initials: "KN", name: "Kanesh" }, { initials: "TP", name: "Theepan" }, { initials: "SJ", name: "Sanjay" }];
  const PRIORITY = ["Image", "High", "Medium", "Low"];
  const FIT = ["Perfect", "Strong", "Moderate", "Limited", "No"];
  const SYSTEMS = ["Paper card / logbook", "Sticker / tag", "Spreadsheet", "BarSociety", "Other software", "Nothing formal", "Unknown"];

  /* ---------------------------------------------------------------- helpers */
  const $ = (s, el = document) => el.querySelector(s);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pad = n => String(n).padStart(2, "0");
  const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = () => ymd(new Date());
  const parse = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const daysFrom = s => Math.round((parse(s) - parse(today())) / 86400000);
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const fmt = s => { if (!s) return ""; const d = parse(s); const y = d.getFullYear() !== new Date().getFullYear() ? " " + d.getFullYear() : ""; return `${d.getDate()} ${MON[d.getMonth()]}${y}`; };
  function when(s) {
    if (!s) return { t: "", c: "" };
    const n = daysFrom(s);
    if (n < 0) return { t: n === -1 ? "1 day late" : `${-n} days late`, c: "late" };
    if (n === 0) return { t: "Today", c: "today" };
    if (n === 1) return { t: "Tomorrow", c: "" };
    if (n < 7) return { t: `In ${n} days`, c: "" };
    return { t: fmt(s), c: "" };
  }
  const people = () => (S.people && S.people.length ? S.people : PEOPLE_FALLBACK);
  const personName = ini => (people().find(p => p.initials === ini) || {}).name || ini || "";
  const av = (ini, sm) => ini ? `<span class="av ${sm ? "sm" : ""} ${esc(ini.toLowerCase())}" title="${esc(personName(ini))}">${esc(ini)}</span>` : `<span class="av ${sm ? "sm" : ""} none" title="No owner">–</span>`;
  const personById = id => (S.people || []).find(p => p.id === id);
  function ago(d) {
    if (!d) return "";
    const m = Math.floor((Date.now() - d.getTime()) / 60000);
    if (m < 1) return "just now";
    if (m < 60) return m + " min ago";
    const h = Math.floor(m / 60);
    if (h < 24) return h + (h === 1 ? " hour ago" : " hours ago");
    return fmt(ymd(d));
  }
  function stamp(ts) {
    if (!ts) return "";
    const d = new Date(ts); let h = d.getHours(); const ap = h < 12 ? "am" : "pm"; h = h % 12 || 12;
    return `${fmt(ymd(d))}, ${h}:${pad(d.getMinutes())} ${ap}`;
  }
  const cityTag = c => `<span class="city">${c === "KL" ? "KL" : "SG"}</span>`;
  const pill = k => `<span class="pill s-${k}">${esc(STAGE[k]?.t || k)}</span>`;
  const byId = id => S.venues.find(v => v.id === id);
  const actsFor = id => S.activities.filter(a => a.venue_id === id).sort((a, b) => (b.happened_on || "").localeCompare(a.happened_on || "") || (b.id - a.id));
  const digits = s => (s || "").replace(/\D/g, "");
  function waNumber(phone, city) {
    let d = digits((phone || "").split("/")[0]);
    if (!d) return "";
    if (city === "SG" && d.length === 8) d = "65" + d;
    if (city === "KL" && d.startsWith("0")) d = "6" + d;
    return d;
  }
  const igUrl = h => h ? (h.startsWith("http") ? h : "https://instagram.com/" + h.replace(/^@/, "").replace(/^instagram\.com\//, "")) : "";
  const webUrl = w => w ? (w.startsWith("http") ? w : "https://" + w) : "";

  /* ---------------------------------------------------------------- icons */
  const I = {
    today: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="m9 15 2 2 4-4"/></svg>',
    venues: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/></svg>',
    guide: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-.9.8-.9 1.4v.3M12 17h.01"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/></svg>',
    back: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h3.5l1.8 4.5-2.3 1.4a11 11 0 0 0 6.1 6.1l1.4-2.3L20 15.5V19a1.5 1.5 0 0 1-1.6 1.5C10.6 20 4 13.4 3.5 5.6A1.5 1.5 0 0 1 5 4Z"/></svg>',
    chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20l1.3-3.6A8 8 0 1 1 8.5 19.4Z"/><path d="M9 10h6M9 13.5h4"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m4 7 8 6 8-6"/></svg>',
    insta: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r=".6" fill="currentColor"/></svg>',
    web: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z"/></svg>',
    visit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z"/><circle cx="12" cy="10" r="2.3"/></svg>',
    meeting: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9.5" r="2.4"/><path d="M3.5 19c.6-3 2.8-4.8 5.5-4.8s4.9 1.8 5.5 4.8M15 14.6c2.6-.3 4.8 1.2 5.5 4.4"/></svg>',
    demo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M11 18.5h2"/></svg>',
    note: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h10l4 4v12H5Z"/><path d="M9 12h6M9 16h4"/></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16Z"/></svg>',
    log: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>',
  };
  const CH_ICON = { Visit: I.visit, Call: I.phone, WhatsApp: I.chat, Email: I.mail, Instagram: I.insta, Meeting: I.meeting, Demo: I.demo, Note: I.note };

  // Official BottleBank logo shapes (dark-background version: white "Bottle", Mint "Bank")
  const LOGO = `<svg viewBox="0 0 320 76" role="img" aria-label="BottleBank"><rect x="23" y="0" width="10" height="10" rx="2" fill="#2DD4BF"/><path d="M23 10 L33 10 L33 18 C37 21 42 28 42 36 L42 46 L14 46 L14 36 C14 28 19 21 23 18Z" fill="#2DD4BF"/><rect x="0" y="46" width="56" height="4" rx="2" fill="#2DD4BF"/><path d="M14 54 L42 54 L42 66 C42 71 38 74 33 74 L23 74 C18 74 14 71 14 66Z" fill="#2DD4BF" opacity="0.25"/><text x="72" y="46" font-family="Manrope, sans-serif" font-weight="800" font-size="42" letter-spacing="-1.5" fill="#FFFFFF">Bottle<tspan fill="#2DD4BF">Bank</tspan></text></svg>`;

  // Bottle fill level: how far along the pipeline a venue is (empty = not contacted, full = client)
  const LEVEL_DEFS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>${[0, 1, 2, 3, 4, 5, 6].map(i => {
    const f = (1 - i / 6) * 100;
    return `<linearGradient id="lv${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="${f}%" style="stop-color:var(--level-empty)"/><stop offset="${f}%" style="stop-color:var(--mint)"/></linearGradient>`;
  }).join("")}</defs></svg>`;
  const BOTTLE = "M4.2 0h3.6v4.2C10 5.3 12 7.3 12 10.2V18.6c0 .8-.6 1.4-1.4 1.4H1.4C.6 20 0 19.4 0 18.6V10.2C0 7.3 2 5.3 4.2 4.2Z";
  function level(k) {
    const s = STAGE[k];
    if (!s || s.lv < 0) return `<svg class="level" viewBox="0 0 12 20" aria-hidden="true"><path d="${BOTTLE}" fill="none" stroke="var(--text-3)" stroke-width="1.2" stroke-dasharray="2 1.6" transform="translate(.6 .6) scale(.9)"/></svg>`;
    return `<svg class="level" viewBox="0 0 12 20" aria-hidden="true"><path d="${BOTTLE}" fill="url(#lv${s.lv})"/></svg>`;
  }

  /* ---------------------------------------------------------------- state */
  const prefs = (() => { try { return JSON.parse(localStorage.getItem("bb-crm-prefs") || "{}"); } catch (e) { return {}; } })();
  const savePrefs = () => { try { localStorage.setItem("bb-crm-prefs", JSON.stringify(prefs)); } catch (e) {} };
  const F = Object.assign({ q: "", tab: "prospects", stage: "all", city: "all", owner: "all", prio: "all", reach: "all", sort: "name", limit: 80 }, prefs.filters2 || {}, { q: "", limit: 80 });
  let todayMine = !!prefs.todayMine;
  applyTheme(prefs.theme || "auto");

  function applyTheme(t) {
    prefs.theme = t; savePrefs();
    if (t === "auto") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", t);
  }

  /* ---------------------------------------------------------------- routing */
  function route() {
    const h = location.hash.replace(/^#/, "");
    const m = h.match(/^venue-(\d+)$/);
    if (m) return { name: "venue", id: Number(m[1]) };
    if (h === "venues" || h === "guide") return { name: h };
    return { name: "today" };
  }
  window.addEventListener("hashchange", () => { closeSheet(); render(); window.scrollTo(0, 0); });

  /* ---------------------------------------------------------------- shell */
  const app = document.getElementById("app");
  function render() {
    if (!S.me) return;
    const r = route();
    const nav = (n, label) => `<a href="#${n}" ${r.name === n || (n === "venues" && r.name === "venue") ? 'aria-current="page"' : ""}>${label}</a>`;
    const demo = S.mode === "demo" ? `<div class="banner gutter"><div class="banner-in">
        <span><b>Preview.</b> Real venues and history, but changes stay in this browser only.</span>
        <label>Viewing as <select id="demo-user">${people().map(p => `<option value="${p.id}" ${p.id === S.me.id ? "selected" : ""}>${esc(p.name)}${p.role === "admin" ? " (admin)" : ""}</option>`).join("")}</select></label>
        <button type="button" data-act="reset-demo">Reset preview data</button></div></div>` : "";
    const off = !S.online ? `<div class="banner offline gutter"><div class="banner-in">You're offline. You can read, but changes won't save until you're back online.</div></div>` : "";
    app.innerHTML = `${LEVEL_DEFS}
      <header class="topbar gutter"><div class="topbar-in">
        <a class="logo" href="#today">${LOGO}<span class="tag">CRM</span></a>
        <nav class="topnav">${nav("today", "Today")}${nav("venues", "Venues")}${nav("guide", "How it works")}</nav>
        <span class="spacer"></span>
        <button class="btn primary add-top" type="button" data-act="add">${I.plus}Add venue</button>
        <button class="me" type="button" data-act="me" aria-label="Your account">${av(S.me.initials)}<span class="me-name">${esc(S.me.name)}</span></button>
      </div></header>
      ${demo}${off}${installBanner()}
      <main class="gutter" id="view"></main>
      <button class="syncbar" id="syncbar" type="button" data-act="resync" aria-live="polite">${syncText()}</button>
      <nav class="tabbar" aria-label="Main"><div class="tabbar-in">
        <a href="#today" ${r.name === "today" ? 'aria-current="page"' : ""}>${I.today}Today</a>
        <a href="#venues" ${r.name === "venues" || r.name === "venue" ? 'aria-current="page"' : ""}>${I.venues}Venues</a>
        <button class="add" type="button" data-act="add"><span class="plus">${I.plus}</span>Add</button>
        <a href="#guide" ${r.name === "guide" ? 'aria-current="page"' : ""}>${I.guide}Guide</a>
      </div></nav>`;
    const view = $("#view");
    if (r.name === "today") view.innerHTML = viewToday();
    else if (r.name === "venues") { view.innerHTML = viewVenues(); renderVenueList(); }
    else if (r.name === "guide") view.innerHTML = viewGuide();
    else view.innerHTML = viewVenue(r.id);
    const du = $("#demo-user"); if (du) du.onchange = () => S.switchDemoUser(du.value);
    const q = $("#q");
    if (q) { q.value = F.q; q.oninput = () => { F.q = q.value; F.limit = 80; renderVenueList(); }; }
    document.querySelectorAll("[data-filter]").forEach(sel => sel.onchange = () => { F[sel.dataset.filter] = sel.value; F.limit = 80; prefs.filters2 = { ...F }; savePrefs(); renderVenueList(); });
  }

  /* ---------------------------------------------------------------- sync status */
  function syncText() {
    const st = S.sync || {};
    const cls = !S.online ? "off" : st.state;
    const txt = !S.online ? `Offline${st.at ? " · last synced " + ago(st.at) : ""}`
      : st.state === "error" ? "Not synced · tap to retry"
      : st.state === "syncing" && !st.at ? "Syncing…"
      : `Synced · ${ago(st.at)}`;
    return `<span class="sdot ${cls}"></span>${txt}`;
  }
  function paintSync() { const b = $("#syncbar"); if (b) b.innerHTML = syncText(); }
  setInterval(paintSync, 20000);

  /* ---------------------------------------------------------------- Today */
  function viewToday() {
    // Always Singapore time, whatever the phone's clock is set to.
    const sg = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Singapore", hour: "numeric", hourCycle: "h23", weekday: "long", day: "numeric", month: "short" })
      .formatToParts(new Date()).map(x => [x.type, x.value]));
    const h = Number(sg.hour);
    const hi = h >= 5 && h < 12 ? "Good morning" : h >= 12 && h < 17 ? "Good afternoon" : h >= 17 && h < 22 ? "Good evening" : "Good night";
    const dateLine = `${sg.weekday} ${sg.day} ${sg.month}`;
    const mine = v => !todayMine || v.owner === S.me.initials;
    const counts = Object.fromEntries(ALL.map(s => [s.k, 0]));
    S.venues.forEach(v => { counts[v.stage] = (counts[v.stage] || 0) + 1; });
    const t7 = ymd(new Date(Date.now() + 7 * 86400000));
    const due = S.venues.filter(v => v.next_date && v.next_date <= t7 && mine(v) && !["lost", "closed"].includes(v.stage))
      .sort((a, b) => a.next_date.localeCompare(b.next_date));
    const later = S.venues.filter(v => v.next_date && v.next_date > t7 && mine(v)).sort((a, b) => a.next_date.localeCompare(b.next_date));
    const noNext = S.venues.filter(v => ACTIVE.includes(v.stage) && !v.next_date && mine(v));
    const lateN = due.filter(v => v.next_date < today()).length;
    const recent = [...S.activities].sort((a, b) => (b.created_at || b.happened_on || "").localeCompare(a.created_at || a.happened_on || "")).slice(0, 12);

    const summary = [
      due.length ? `${due.length} follow-up${due.length > 1 ? "s" : ""} this week` : "No follow-ups due this week",
      lateN ? `${lateN} late` : "",
    ].filter(Boolean).join(" · ");

    return `
      <div class="page-head"><div><h1>${hi}, ${esc(S.me.name)}</h1><p>${dateLine} · ${summary}</p></div>
        <div class="showing"><span class="label">Showing</span>
          <div class="seg2" role="group" aria-label="Whose follow-ups">
            <button type="button" data-act="today-mine" data-v="0" aria-pressed="${!todayMine}">${!todayMine ? "✓ " : ""}Everyone</button>
            <button type="button" data-act="today-mine" data-v="1" aria-pressed="${todayMine}">${todayMine ? "✓ " : ""}Mine</button>
          </div></div></div>

      <section aria-label="Pipeline">
        <div class="sec-head"><h2>Pipeline</h2><span class="count num">${S.venues.length} venues</span></div>
        <div class="funnel">${STAGES.map(s => `<a class="fstep ${s.k === "client" ? "client" : ""}" href="#venues" data-act="goto-stage" data-stage="${s.k}">
            ${level(s.k)}<span class="n">${counts[s.k] || 0}</span><span class="t">${s.t}</span></a>`).join("")}</div>
        <div class="side-stages">${SIDE.map(s => `<a href="#venues" data-act="goto-stage" data-stage="${s.k}">${s.t} <b>${counts[s.k] || 0}</b></a>`).join("")}</div>
      </section>

      <section>
        <div class="sec-head"><h2>Follow-ups due</h2><span class="count num">${due.length}</span></div>
        <div class="list">${due.length ? due.map(rowFollow).join("") : `<div class="empty">Nothing due in the next 7 days${todayMine ? " for you" : ""}. When you log a touch, set a next step and it shows up here.</div>`}</div>
      </section>

      ${noNext.length ? `<section>
        <div class="sec-head"><h2>Needs a next step</h2><span class="count num">${noNext.length}</span></div>
        <p class="muted" style="margin:0;font-size:14px">These are in play but nobody has set what happens next.</p>
        <div class="list">${noNext.map(rowFollow).join("")}</div></section>` : ""}

      ${later.length ? `<section>
        <div class="sec-head"><h2>Coming up later</h2><span class="count num">${later.length}</span></div>
        <div class="list">${later.slice(0, 8).map(rowFollow).join("")}</div></section>` : ""}

      <section>
        <div class="sec-head"><h2>Latest from the team</h2></div>
        <div class="list feed">${recent.map(a => {
          const v = byId(a.venue_id); if (!v) return "";
          return `<div class="item">${av(a.author, true)}<div class="what"><a href="#venue-${v.id}">${esc(v.name)}</a> · ${esc(a.summary)}
            <div class="meta">${esc(personName(a.author))} · ${esc(a.channel)} · ${fmt(a.happened_on)}</div></div></div>`;
        }).join("")}</div>
      </section>`;
  }

  function rowFollow(v) {
    const w = when(v.next_date);
    return `<a class="row" href="#venue-${v.id}">${level(v.stage)}
      <span class="main"><span class="name">${esc(v.name)} ${cityTag(v.city)}</span>
        <span class="sub">${esc(v.next_step || "No next step written")}</span></span>
      <span class="right"><span class="when num ${w.c}">${esc(w.t || STAGE[v.stage]?.t || "")}</span>${av(v.owner, true)}</span></a>`;
  }

  /* ---------------------------------------------------------------- Venues */
  const TABS = [
    { k: "prospects", t: "Prospects", stages: ["lead", "contacted", "talking", "meeting", "quote", "trial", "hold"] },
    { k: "clients", t: "Clients", stages: ["client"] },
    { k: "out", t: "Not pursuing", stages: ["lost", "unreachable", "closed"] },
  ];
  const tabOf = stage => (TABS.find(t => t.stages.includes(stage)) || TABS[0]).k;
  const REACH = [
    { k: "email", t: "Email", short: "Email", ch: ["Email"], has: v => !!v.email },
    { k: "wa", t: "WhatsApp", short: "WA", ch: ["WhatsApp"], has: v => !!waNumber(v.phone, v.city) },
    { k: "ig", t: "Instagram", short: "IG", ch: ["Instagram"], has: v => !!v.instagram },
    { k: "met", t: "Met / called", short: "Met", ch: ["Visit", "Meeting", "Demo", "Call"], has: () => true },
  ];
  const FAIL = /bounced|blocked|not delivered|failed|unavailable|wrong number|not on whatsapp/i;
  // For each venue: per channel, the latest touch and whether it failed
  function reachMap() {
    const m = new Map();
    for (const a of S.activities) {
      const g = REACH.find(r => r.ch.includes(a.channel)); if (!g) continue;
      let o = m.get(a.venue_id); if (!o) m.set(a.venue_id, o = {});
      const cur = o[g.k];
      if (!cur || (a.happened_on || "") >= cur.d) o[g.k] = { d: a.happened_on || "", fail: FAIL.test(a.summary) && !/^billy|replied/i.test(a.summary) };
    }
    return m;
  }
  function reachState(v, r, rm) {
    const x = (rm.get(v.id) || {})[r.k];
    if (x) return x.fail ? { s: "fail", d: x.d } : { s: "done", d: x.d };
    return { s: r.has(v) ? "open" : "none" };
  }
  const MARK = { done: "✓", fail: "!", open: "○", none: "–" };
  const REACH_TIP = { done: "Done", fail: "Bounced or failed", open: "Not yet", none: "No contact details" };
  function tick(st, r, withLabel) {
    const tip = `${r.t}: ${REACH_TIP[st.s]}${st.d ? " · " + fmt(st.d) : ""}`;
    return `<span class="tick t-${st.s}" title="${esc(tip)}" aria-label="${esc(tip)}">${withLabel ? `<span class="tl-l">${r.short}</span>` : ""}<span class="tm">${MARK[st.s]}</span>${!withLabel && st.d ? `<span class="td">${fmt(st.d)}</span>` : ""}</span>`;
  }

  function viewVenues() {
    const opt = (k, v, l) => `<option value="${esc(v)}" ${F[k] === v ? "selected" : ""}>${esc(l)}</option>`;
    const tab = TABS.find(t => t.k === F.tab) || TABS[0];
    return `
      <div class="page-head"><div><h1>Venues</h1><p id="vcount" class="num"></p></div>
        <div class="tabs" role="tablist" aria-label="Venue groups" id="vtabs"></div></div>
      <div class="toolbar">
        <label class="search">${I.search}<input id="q" type="search" placeholder="Search venue, group, area, contact, phone" autocomplete="off" aria-label="Search venues"></label>
        <div class="filters">
          <select data-filter="city" aria-label="City">${opt("city", "all", "SG + KL")}${opt("city", "SG", "Singapore")}${opt("city", "KL", "KL")}</select>
          <select data-filter="stage" aria-label="Stage">${opt("stage", "all", "Any stage")}${tab.stages.map(k => opt("stage", k, STAGE[k].t)).join("")}</select>
          <select data-filter="reach" aria-label="Contact">${opt("reach", "all", "Any contact")}${opt("reach", "none", "Not contacted at all")}${REACH.map(r => opt("reach", "no-" + r.k, r.k === "met" ? "Not met or called yet" : "Not on " + r.t + " yet")).join("")}${opt("reach", "fail", "Bounced or failed")}</select>
          <select data-filter="owner" aria-label="Owner">${opt("owner", "all", "Any owner")}${people().map(p => opt("owner", p.initials, p.name)).join("")}${opt("owner", "none", "No owner")}</select>
          <select data-filter="prio" aria-label="Priority">${opt("prio", "all", "Any priority")}${PRIORITY.map(p => opt("prio", p, p === "Image" ? "Image (big name)" : p)).join("")}</select>
          <select data-filter="sort" aria-label="Sort">${opt("sort", "name", "A to Z")}${opt("sort", "stage", "Furthest along first")}${opt("sort", "next", "Next step date")}${opt("sort", "recent", "Last contact")}</select>
        </div>
        <p class="legend"><span class="tick t-done"><span class="tm">✓</span></span> done <span class="tick t-fail"><span class="tm">!</span></span> bounced or failed <span class="tick t-open"><span class="tm">○</span></span> not yet <span class="tick t-none"><span class="tm">–</span></span> no contact details</p>
      </div>
      <div class="vtable-wrap" id="vlist"></div>`;
  }

  function filtered(rm, ignoreTab) {
    const q = F.q.trim().toLowerCase();
    const qd = digits(q);
    const tab = TABS.find(t => t.k === F.tab) || TABS[0];
    return S.venues.filter(v => {
      if (!ignoreTab && !tab.stages.includes(v.stage)) return false;
      if (!ignoreTab && F.stage !== "all" && v.stage !== F.stage) return false;
      if (F.city !== "all" && v.city !== F.city) return false;
      if (F.owner === "none" ? v.owner : F.owner !== "all" && v.owner !== F.owner) return false;
      if (F.prio !== "all" && v.priority !== F.prio) return false;
      if (F.reach !== "all") {
        const st = REACH.map(r => reachState(v, r, rm).s);
        if (F.reach === "none" && st.some(s => s === "done" || s === "fail")) return false;
        if (F.reach === "fail" && !st.includes("fail")) return false;
        if (F.reach.startsWith("no-")) { const i = REACH.findIndex(r => "no-" + r.k === F.reach); if (st[i] === "done") return false; }
      }
      if (!q) return true;
      const hay = [v.name, v.grp, v.area, v.contact_name, v.email, v.instagram, v.venue_type].join(" ").toLowerCase();
      return hay.includes(q) || (qd.length >= 4 && digits(v.phone).includes(qd));
    });
  }
  function lastAct(id) { let m = ""; for (const a of S.activities) if (a.venue_id === id && (a.happened_on || "") > m) m = a.happened_on; return m; }
  function renderVenueList() {
    const el = $("#vlist"); if (!el) return;
    const rm = reachMap();
    const base = filtered(rm, true);
    $("#vtabs").innerHTML = TABS.map(t => `<button class="tab" role="tab" type="button" data-act="vtab" data-tab="${t.k}" aria-selected="${F.tab === t.k}">${t.t} <span class="c">${base.filter(v => t.stages.includes(v.stage)).length}</span></button>`).join("");
    let list = filtered(rm, false);
    const lv = v => STAGE[v.stage]?.lv ?? -1;
    if (F.sort === "stage") list.sort((a, b) => lv(b) - lv(a) || a.name.localeCompare(b.name));
    else if (F.sort === "next") list.sort((a, b) => (a.next_date || "9999").localeCompare(b.next_date || "9999") || a.name.localeCompare(b.name));
    else if (F.sort === "recent") { const m = new Map(list.map(v => [v.id, lastAct(v.id)])); list.sort((a, b) => m.get(b.id).localeCompare(m.get(a.id)) || a.name.localeCompare(b.name)); }
    else list.sort((a, b) => a.name.localeCompare(b.name));
    const tab = TABS.find(t => t.k === F.tab) || TABS[0];
    $("#vcount").textContent = `${list.length} ${tab.t.toLowerCase()}${F.q || F.stage !== "all" || F.city !== "all" || F.reach !== "all" || F.owner !== "all" || F.prio !== "all" ? " match" : ""}`;
    if (!list.length) { el.innerHTML = `<div class="list"><div class="empty">No venues match. Clear the search or a filter, or add it as a new venue.</div></div>`; return; }
    const rows = list.slice(0, F.limit);
    el.innerHTML = `<table class="vtable">
      <thead><tr><th class="c-name">Venue</th><th class="c-stage">Stage</th>${REACH.map(r => `<th class="c-tick">${r.t}</th>`).join("")}<th class="c-sj">Priority</th><th class="c-sj">Fit</th><th class="c-sj">Uses today</th><th class="c-next">Next step</th></tr></thead>
      <tbody>${rows.map(v => {
        const w = when(v.next_date);
        const ticks = REACH.map(r => reachState(v, r, rm));
        return `<tr data-href="#venue-${v.id}">
          <td class="c-name"><a href="#venue-${v.id}"><span class="vn">${esc(v.name)}</span> ${cityTag(v.city)}</a>
            <span class="vs">${esc([v.area, v.venue_type].filter(Boolean).join(" · "))}</span>
            <span class="mticks">${ticks.map((st, i) => tick(st, REACH[i], true)).join("")}</span></td>
          <td class="c-stage">${pill(v.stage)}</td>
          ${ticks.map((st, i) => `<td class="c-tick">${tick(st, REACH[i], false)}</td>`).join("")}
          <td class="c-sj">${esc(v.priority || "")}</td><td class="c-sj">${esc(v.fit || "")}</td><td class="c-sj">${esc(v.current_system || "")}</td>
          <td class="c-next">${w.t ? `<span class="when num ${w.c}">${esc(w.t)}</span>` : ""}</td></tr>`;
      }).join("")}</tbody></table>` + (list.length > F.limit ? `<button class="more" type="button" data-act="more">Show ${Math.min(80, list.length - F.limit)} more</button>` : "");
  }

  /* ---------------------------------------------------------------- Venue detail */
  function viewVenue(id) {
    const v = byId(id);
    if (!v) return `<a class="back" href="#venues">${I.back}Venues</a><div class="list"><div class="empty">This venue isn't in the CRM. It may have been deleted.</div></div>`;
    const acts = actsFor(id);
    const w = when(v.next_date);
    const wa = waNumber(v.phone, v.city);
    const contact = [
      v.phone && digits(v.phone) ? `<a class="btn" href="tel:+${waNumber(v.phone, v.city) || digits(v.phone)}">${I.phone}Call</a>` : "",
      wa ? `<a class="btn" href="https://wa.me/${wa}" target="_blank" rel="noopener">${I.chat}WhatsApp</a>` : "",
      v.email ? `<a class="btn" href="mailto:${esc(v.email)}">${I.mail}Email</a>` : "",
      v.instagram ? `<a class="btn" href="${esc(igUrl(v.instagram))}" target="_blank" rel="noopener">${I.insta}Instagram</a>` : "",
      v.website ? `<a class="btn" href="${esc(webUrl(v.website))}" target="_blank" rel="noopener">${I.web}Website</a>` : "",
    ].join("");
    const kv = (k, val, copy) => `<div class="kv"><dt>${k}</dt><dd class="${val ? "" : "empty"}">${val ? esc(val) + (copy ? ` <button class="copy" type="button" data-act="copy" data-v="${esc(val)}">Copy</button>` : "") : "–"}</dd></div>`;
    const isAdmin = S.me.role === "admin";
    return `
      <a class="back" href="#venues">${I.back}Venues</a>
      <div class="vhead">
        <div class="tags">${cityTag(v.city)}${v.grp ? `<span class="tag2">${esc(v.grp)}</span>` : ""}</div>
        <h1>${esc(v.name)}</h1>
        ${[v.venue_type, v.area].filter(Boolean).length ? `<div class="facts">${esc([v.venue_type, v.area].filter(Boolean).join(" · "))}</div>` : ""}
        <div class="tags">
          <button class="pill s-${v.stage} stage-btn" type="button" data-act="stage" data-id="${v.id}" aria-label="Stage: ${esc(STAGE[v.stage]?.t)}. Change">${level(v.stage)}${esc(STAGE[v.stage]?.t || v.stage)}</button>
          ${v.priority ? `<span class="tag2">${v.priority === "Image" ? "Image (big name)" : esc(v.priority) + " priority"}</span>` : ""}
          ${v.fit ? `<span class="tag2">${esc(v.fit)} fit</span>` : ""}
          ${v.current_system ? `<span class="tag2">Uses: ${esc(v.current_system)}</span>` : ""}
        </div>
      </div>
      <div class="actions"><button class="btn primary" type="button" data-act="log" data-id="${v.id}">${I.log}Log activity</button>${contact}</div>
      <div class="vgrid">
        <div style="display:flex;flex-direction:column;gap:20px;min-width:0">
          <section>
            <div class="sec-head"><h2>Next step</h2></div>
            <div class="nextcard ${w.c === "late" ? "late" : ""}">
              ${v.next_step || v.next_date ? `<div class="what">${esc(v.next_step || "Follow up")}</div>
                <div class="when num ${w.c}">${v.next_date ? `${esc(w.t)}${w.t !== fmt(v.next_date) ? " · " + fmt(v.next_date) : ""}` : "No date set"} · ${v.owner ? esc(personName(v.owner)) : "No owner"}</div>`
                : `<div class="none">No next step yet. Every venue that's in play should have one, with a date.</div>`}
              <div class="actions"><button class="btn" type="button" data-act="next" data-id="${v.id}">${I.edit}${v.next_step ? "Change" : "Set next step"}</button>
                ${v.next_step ? `<button class="btn ghost" type="button" data-act="log" data-id="${v.id}">Done? Log it</button>` : ""}</div>
            </div>
          </section>
          <section>
            <div class="sec-head"><h2>History</h2><span class="count num">${acts.length}</span></div>
            <div class="timeline">${acts.length ? acts.map(a => `<div class="tl"><span class="ic ${a.channel.toLowerCase()}">${CH_ICON[a.channel] || I.note}</span>
                <div><div class="txt">${esc(a.summary)}</div><div class="meta">${av(a.author, true)}<span>${esc(personName(a.author))}</span><span>${esc(a.channel)}</span><span>${fmt(a.happened_on)}</span>
                ${S.canDeleteActivity(a) && a.created_by ? `<button class="del" type="button" data-act="del-act" data-id="${a.id}">Remove</button>` : ""}</div></div></div>`).join("")
              : `<div class="empty">Nothing logged yet. Tap Log activity after every call, message or visit.</div>`}</div>
          </section>
        </div>
        <section>
          <div class="sec-head"><h2>Details</h2><button class="btn ghost" type="button" data-act="edit" data-id="${v.id}">${I.edit}Edit</button></div>
          <dl class="details">
            ${kv("Contact", [v.contact_name, v.contact_role].filter(Boolean).join(", "))}
            ${kv("Phone", v.phone, true)}${kv("Email", v.email, true)}${kv("Instagram", v.instagram)}${kv("Website", v.website)}
            ${kv("Address", v.address)}${kv("Group", v.grp)}
            ${kv("Owner", v.owner ? personName(v.owner) : "")}${kv("Introduced by", v.introducer ? personName(v.introducer) : "")}
            ${kv("Notes", v.notes)}
          </dl>
          <p class="updated">${v.updated_by && personById(v.updated_by)
            ? `Last updated by <b>${esc(personById(v.updated_by).name)}</b> · ${esc(stamp(v.updated_at))}`
            : v.updated_by ? `Last updated ${esc(stamp(v.updated_at))}` : `Imported from our venue sheets and email history${v.updated_at ? " · " + esc(stamp(v.updated_at)) : ""}`}</p>
          ${isAdmin ? `<div id="del-zone"><button class="btn danger" type="button" data-act="del-venue-ask" data-id="${v.id}" style="margin-top:8px">Delete venue</button></div>` : ""}
        </section>
      </div>`;
  }

  /* ---------------------------------------------------------------- Guide */
  function viewGuide() {
    const ppl = [
      ["KN", "Kanesh", "Main sales owner", "Contacts venues, runs meetings and demos, sends quotes, closes. Only Kanesh can delete venues."],
      ["TP", "Theepan", "Product and tech", "Joins demos, answers technical questions, handles setup once a venue signs."],
      ["SJ", "Sanjay", "Introductions", "Opens doors through his network, visits venues, and logs who he spoke to and what they said."],
    ];
    return `
      <div class="page-head"><div><h1>How it works</h1><p>One list of every venue, where each one stands, and what happens next.</p></div></div>
      <section>
        <div class="sec-head"><h2>The one rule</h2></div>
        <ol class="habits">
          <li><span>After every call, message, meeting or visit, open the venue and tap <b>Log activity</b>. One line on what they said is enough.</span></li>
          <li><span>Move the stage if it changed. The bottle fills up as a venue gets closer to signing.</span></li>
          <li><span>Leave a <b>next step with a date</b>. That's what puts it on everyone's Today list, so nothing slips.</span></li>
        </ol>
      </section>
      <section>
        <div class="sec-head"><h2>Stages</h2></div>
        <div class="stage-guide">${ALL.map(s => `<div class="sg">${level(s.k)}<div><h3>${s.t}</h3><p>${s.d}</p>${s.was ? `<div class="was">In Sanjay's sheet: ${s.was}</div>` : ""}</div></div>`).join("")}</div>
      </section>
      <section>
        <div class="sec-head"><h2>Who does what</h2></div>
        <div class="cards">${ppl.map(([i, n, r, d]) => `<div class="card"><h3>${av(i)}${n}</h3><div class="label">${r}</div><p>${d}</p></div>`).join("")}</div>
      </section>
      <section>
        <div class="sec-head"><h2>Other fields</h2></div>
        <div class="cards">
          <div class="card"><h3>Owner</h3><p>The person working the venue right now. Change it when someone else takes over.</p></div>
          <div class="card"><h3>Introduced by</h3><p>Who opened the door, so we remember how we got in.</p></div>
          <div class="card"><h3>Priority</h3><ul><li><b>Image</b>: a big-name venue that helps the brand</li><li><b>High / Medium / Low</b>: how much effort it's worth now</li></ul></div>
          <div class="card"><h3>Fit</h3><p>How much bottle service they do: Perfect, Strong, Moderate, Limited or No fit.</p></div>
          <div class="card"><h3>Uses</h3><p>How they track bottles today: paper cards, stickers, a spreadsheet, BarSociety or other software.</p></div>
        </div>
      </section>`;
  }

  /* ---------------------------------------------------------------- sheets */
  function openSheet(build) {
    const root = $("#sheet-root");
    root.innerHTML = `<div class="scrim" data-act="scrim"><div class="sheet" role="dialog" aria-modal="true">${build.html}</div></div>`;
    const sheet = $(".sheet", root);
    build.bind && build.bind(sheet);
    const first = sheet.querySelector("[autofocus]") || sheet.querySelector("input, select, textarea, button:not(.x)");
    if (first && matchMedia("(min-width: 700px)").matches) first.focus();
    document.body.style.overflow = "hidden";
  }
  function closeSheet() {
    const root = $("#sheet-root"); if (root) root.innerHTML = "";
    document.body.style.overflow = "";
  }
  const head = t => `<div class="sheet-head"><h2>${t}</h2><button class="x" type="button" data-act="close" aria-label="Close">${I.x}</button></div>`;
  const sel = (name, opts, cur, blank) => `<select name="${name}" id="f-${name}">${blank !== undefined ? `<option value="">${esc(blank)}</option>` : ""}${opts.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}" ${String(cur ?? "") === String(v) ? "selected" : ""}>${esc(l)}</option>`; }).join("")}</select>`;
  const ownerOpts = () => people().map(p => [p.initials, p.name]);

  function toast(msg) {
    const r = $("#toast-root"); if (!r) return;
    r.innerHTML = `<div class="toast" role="status">${msg}</div>`;
    clearTimeout(toast.t); toast.t = setTimeout(() => { r.innerHTML = ""; }, 2600);
  }
  async function guard(btn, fn) {
    const err = btn.form ? btn.form.querySelector(".error") : null;
    btn.disabled = true; if (err) err.textContent = "";
    try { await fn(); } catch (e) { console.error(e); if (err) err.textContent = e.message || "That didn't save. Check your connection and try again."; else toast(esc(e.message || "That didn't save.")); }
    finally { btn.disabled = false; }
  }

  function logSheet(v) {
    const suggested = v.stage === "lead" ? "contacted" : v.stage;
    openSheet({
      html: `${head("Log activity")}
        <form id="log-form" novalidate>
          <div class="field"><span>${esc(v.name)}: how did you reach them?</span>
            <div class="seg">${CHANNELS.map((c, i) => `<label><input type="radio" name="channel" value="${c}" ${i === 0 ? "checked" : ""}><span>${CH_ICON[c]}${c}</span></label>`).join("")}</div></div>
          <label class="field"><span>What happened?</span><textarea name="summary" id="f-summary" placeholder="e.g. Met the manager. They use paper cards and lose bottles every month. Wants a demo next week." required></textarea></label>
          <div class="two">
            <label class="field"><span>When</span><input type="date" name="happened_on" id="f-happened_on" value="${today()}" max="${today()}"></label>
            <label class="field"><span>Stage now</span>${sel("stage", ALL.map(s => [s.k, s.t]), suggested)}</label>
          </div>
          <label class="field"><span>Next step</span><input name="next_step" id="f-next_step" value="${esc(v.next_step || "")}" placeholder="e.g. Book a demo with the owner"></label>
          <div class="two">
            <label class="field"><span>By when</span><input type="date" name="next_date" id="f-next_date" value="${esc(v.next_date || "")}"></label>
            <label class="field"><span>Who's on it</span>${sel("owner", ownerOpts(), v.owner || S.me.initials)}</label>
          </div>
          <p class="error" role="alert"></p>
          <button class="btn primary block" type="submit">Save</button>
        </form>`,
      bind(sheet) {
        const f = $("#log-form", sheet);
        f.onsubmit = e => {
          e.preventDefault();
          const d = Object.fromEntries(new FormData(f));
          if (!d.summary.trim()) { $(".error", f).textContent = "Write a line about what happened."; return; }
          guard($("button[type=submit]", f), async () => {
            let summary = d.summary.trim();
            if (d.stage !== v.stage) summary += `\n→ Moved from ${STAGE[v.stage]?.t} to ${STAGE[d.stage]?.t}.`;
            await S.addActivity({ venue_id: v.id, happened_on: d.happened_on || today(), channel: d.channel, summary });
            await S.updateVenue(v.id, { stage: d.stage, next_step: d.next_step.trim(), next_date: d.next_date || null, owner: d.owner });
            closeSheet(); toast(`Logged for <b>${esc(v.name)}</b>`);
          });
        };
      },
    });
  }

  function stageSheet(v) {
    openSheet({
      html: `${head("Change stage")}<p class="muted" style="margin:0">${esc(v.name)} is <b>${esc(STAGE[v.stage]?.t)}</b>. Pick where it is now. The change is added to its history.</p>
        <div class="stage-pick">${ALL.map(s => `<button type="button" data-pick="${s.k}" aria-pressed="${s.k === v.stage}">${level(s.k)}<span><b>${s.t}</b><small>${s.d}</small></span></button>`).join("")}</div>`,
      bind(sheet) {
        sheet.querySelectorAll("[data-pick]").forEach(b => b.onclick = () => {
          const k = b.dataset.pick; if (k === v.stage) { closeSheet(); return; }
          guard(b, async () => {
            await S.updateVenue(v.id, { stage: k });
            await S.addActivity({ venue_id: v.id, happened_on: today(), channel: "Note", summary: `Moved from ${STAGE[v.stage]?.t} to ${STAGE[k]?.t}.` });
            closeSheet(); toast(`<b>${esc(v.name)}</b> is now ${esc(STAGE[k].t)}`);
          });
        });
      },
    });
  }

  function nextSheet(v) {
    openSheet({
      html: `${head("Next step")}
        <form id="next-form" novalidate>
          <label class="field"><span>What happens next at ${esc(v.name)}?</span><input name="next_step" id="f-next_step" value="${esc(v.next_step || "")}" placeholder="e.g. Call Adrian about the quotation" autofocus></label>
          <div class="two">
            <label class="field"><span>By when</span><input type="date" name="next_date" id="f-next_date" value="${esc(v.next_date || "")}"></label>
            <label class="field"><span>Who's on it</span>${sel("owner", ownerOpts(), v.owner || S.me.initials)}</label>
          </div>
          <p class="error" role="alert"></p>
          <div class="actions"><button class="btn primary" type="submit">Save</button>${v.next_step || v.next_date ? `<button class="btn" type="button" id="clear-next">Clear next step</button>` : ""}</div>
        </form>`,
      bind(sheet) {
        const f = $("#next-form", sheet);
        f.onsubmit = e => { e.preventDefault(); const d = Object.fromEntries(new FormData(f));
          guard($("button[type=submit]", f), async () => { await S.updateVenue(v.id, { next_step: d.next_step.trim(), next_date: d.next_date || null, owner: d.owner }); closeSheet(); toast("Next step saved"); }); };
        const c = $("#clear-next", sheet);
        if (c) c.onclick = () => guard(c, async () => { await S.updateVenue(v.id, { next_step: "", next_date: null }); closeSheet(); toast("Next step cleared"); });
      },
    });
  }

  function editSheet(v) {
    const isNew = !v;
    v = v || { city: F.city === "KL" ? "KL" : "SG", stage: "lead", owner: S.me.initials, introducer: S.me.initials };
    const inp = (name, label, ph = "", type = "text") => `<label class="field"><span>${label}</span><input type="${type}" name="${name}" id="f-${name}" value="${esc(v[name] || "")}" placeholder="${esc(ph)}"></label>`;
    openSheet({
      html: `${head(isNew ? "Add venue" : "Edit details")}
        <form id="edit-form" novalidate>
          ${inp("name", "Venue name", "e.g. Jungle Ballroom")}
          <div id="dupe"></div>
          <div class="two"><label class="field"><span>City</span>${sel("city", [["SG", "Singapore"], ["KL", "Kuala Lumpur"]], v.city)}</label>${inp("area", "Area", "e.g. Clarke Quay")}</div>
          <div class="two">${inp("venue_type", "Type", "Club, bar, KTV lounge…")}${inp("grp", "Group", "e.g. Zouk Group")}</div>
          <div class="two">${inp("contact_name", "Contact person")}${inp("contact_role", "Their role", "Owner, manager, COO…")}</div>
          <div class="two">${inp("phone", "Phone", "+65 9123 4567", "tel")}${inp("email", "Email", "", "email")}</div>
          <div class="two">${inp("instagram", "Instagram", "@handle")}${inp("website", "Website")}</div>
          ${inp("address", "Address")}
          <div class="two"><label class="field"><span>Stage</span>${sel("stage", ALL.map(s => [s.k, s.t]), v.stage)}</label>
            <label class="field"><span>Priority</span>${sel("priority", PRIORITY.map(p => [p, p === "Image" ? "Image (big name)" : p]), v.priority, "Not set")}</label></div>
          <div class="two"><label class="field"><span>Owner</span>${sel("owner", ownerOpts(), v.owner, "No owner")}</label>
            <label class="field"><span>Introduced by</span>${sel("introducer", [...ownerOpts(), ["Other", "Someone else"]], v.introducer, "Not set")}</label></div>
          <div class="two"><label class="field"><span>Fit</span>${sel("fit", FIT, v.fit, "Not set")}</label>
            <label class="field"><span>Uses today</span>${sel("current_system", SYSTEMS, v.current_system, "Not set")}</label></div>
          <label class="field"><span>Notes</span><textarea name="notes" id="f-notes" placeholder="Anything useful: who decides, opening hours, how many bottles they park…">${esc(v.notes || "")}</textarea></label>
          <p class="error" role="alert"></p>
          <button class="btn primary block" type="submit">${isNew ? "Add venue" : "Save changes"}</button>
        </form>`,
      bind(sheet) {
        const f = $("#edit-form", sheet);
        const nameIn = $("#f-name", f);
        if (isNew) {
          nameIn.focus();
          nameIn.oninput = () => {
            const q = nameIn.value.trim().toLowerCase();
            const hits = q.length < 3 ? [] : S.venues.filter(x => x.name.toLowerCase().includes(q)).slice(0, 3);
            $("#dupe", f).innerHTML = hits.length ? `<div class="dupe">Already in the CRM: ${hits.map(h => `<a href="#venue-${h.id}">${esc(h.name)} (${h.city})</a>`).join(", ")}</div>` : "";
          };
        }
        f.onsubmit = e => {
          e.preventDefault();
          const d = Object.fromEntries(new FormData(f));
          Object.keys(d).forEach(k => d[k] = d[k].trim());
          if (!d.name) { $(".error", f).textContent = "Give the venue a name."; return; }
          guard($("button[type=submit]", f), async () => {
            if (isNew) {
              const nv = await S.addVenue(d);
              await S.addActivity({ venue_id: nv.id, happened_on: today(), channel: "Note", summary: "Added to the CRM." });
              closeSheet(); location.hash = "venue-" + nv.id; toast(`Added <b>${esc(nv.name)}</b>`);
            } else {
              await S.updateVenue(v.id, d); closeSheet(); toast("Saved");
            }
          });
        };
      },
    });
  }

  /* ---------------------------------------------------------------- install on phone */
  const isStandalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const UA = navigator.userAgent;
  const isIOS = /iphone|ipad|ipod/i.test(UA) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isIOSSafari = isIOS && !/crios|fxios|edgios|gsa\//i.test(UA);
  const SHARE_ICON = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px"><path d="M12 3v12M8 7l4-4 4 4"/><path d="M6 11H5v10h14V11h-1"/></svg>';
  let installEvt = null;
  window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); installEvt = e; if (S.me) render(); });
  window.addEventListener("appinstalled", () => { installEvt = null; prefs.installHidden = true; savePrefs(); toast("Installed. Open <b>BB CRM</b> from your home screen."); if (S.me) render(); });
  function installBanner() {
    if (S.mode === "demo" || isStandalone() || prefs.installHidden) return "";
    let msg = "";
    if (installEvt) msg = `<span><b>Install the CRM on this phone</b> so it opens like an app.</span><button type="button" data-act="install">Install</button>`;
    else if (isIOSSafari) msg = `<span><b>Add the CRM to your home screen:</b> tap Share ${SHARE_ICON} at the bottom, then <b>Add to Home Screen</b>.</span>`;
    else if (isIOS) msg = `<span><b>To install on iPhone,</b> open this link in Safari, then Share ${SHARE_ICON} → Add to Home Screen.</span>`;
    else return "";
    return `<div class="banner gutter"><div class="banner-in">${msg}<button type="button" data-act="install-hide">Not now</button></div></div>`;
  }
  function installHelp() {
    if (isStandalone()) return `<p class="muted" style="margin:0">Installed on this device ✓</p>`;
    return `${installEvt ? `<button class="btn primary" type="button" data-act="install">Install on this device</button>` : ""}
      <ul class="muted" style="margin:0;padding-left:18px;font-size:14px;display:flex;flex-direction:column;gap:4px">
        <li><b>iPhone:</b> open the CRM link in Safari → Share ${SHARE_ICON} → Add to Home Screen.</li>
        <li><b>Android:</b> open it in Chrome → menu ⋮ → Install app (or Add to Home screen).</li>
      </ul>${S.mode === "demo" ? `<p class="muted" style="margin:0;font-size:13px">This works on the real CRM link, not inside this preview.</p>` : ""}`;
  }

  function meSheet() {
    const t = prefs.theme || "auto";
    openSheet({
      html: `${head(esc(S.me.name))}
        <p class="muted" style="margin:0">${S.me.role === "admin" ? "Admin: can add, edit and delete venues." : "Can add and edit venues and log activity. Only Kanesh can delete venues."}</p>
        <div class="field"><span>Appearance</span><div class="seg">${[["auto", "Match phone"], ["light", "Light"], ["dark", "Dark"]].map(([k, l]) => `<label><input type="radio" name="theme" value="${k}" ${t === k ? "checked" : ""}><span>${l}</span></label>`).join("")}</div></div>
        <div class="field"><span>Install on your phone</span>${installHelp()}</div>
        <div class="field"><span>Your PIN</span><button class="btn" type="button" data-act="change-pin">Change my PIN</button></div>
        <div class="field"><span>Backup</span><button class="btn" type="button" data-act="backup">${I.download}Download everything (Excel)</button>
          <span class="hint">All venues and their full history in one spreadsheet.</span></div>
        ${S.me.role === "admin" ? `<div class="field"><span>Team</span><button class="btn" type="button" data-act="team">Manage team and PINs</button></div>` : ""}
        ${S.mode === "demo" ? "" : `<button class="btn ghost" type="button" data-act="signout">Sign out of this phone</button>`}`,
      bind(sheet) { sheet.querySelectorAll("input[name=theme]").forEach(r => r.onchange = () => applyTheme(r.value)); },
    });
  }

  /* ---------------------------------------------------------------- PIN, team, backup */
  function changePinSheet() {
    openSheet({
      html: `${head("Change my PIN")}
        <form novalidate>
          <label class="field"><span>New 6-digit PIN</span><input name="a" type="password" inputmode="numeric" autocomplete="new-password" maxlength="6" pattern="[0-9]{6}" required></label>
          <label class="field"><span>Type it again</span><input name="b" type="password" inputmode="numeric" autocomplete="new-password" maxlength="6" pattern="[0-9]{6}" required></label>
          <p class="error" role="alert"></p>
          <button class="btn primary block" type="submit">Save PIN</button>
        </form>`,
      bind(sheet) {
        const f = $("form", sheet);
        f.onsubmit = e => {
          e.preventDefault();
          const a = f.a.value.trim(), b = f.b.value.trim(), err = $(".error", f);
          if (!/^[0-9]{6}$/.test(a)) { err.textContent = "Use exactly 6 numbers."; return; }
          if (a !== b) { err.textContent = "Those two don't match. Try again."; return; }
          guard($("button[type=submit]", f), async () => { await S.changePin(a); closeSheet(); toast("PIN changed. Use it next time you sign in."); });
        };
      },
    });
  }

  function teamSheet() {
    const me = S.me;
    const rows = people().filter(p => p.id).map(p => `<div class="team-row">
        ${av(p.initials)}<div class="tm"><b>${esc(p.name)}${p.role === "admin" ? ' <span class="tag2">Admin</span>' : ""}</b>
        <small>${esc(p.title || "")}${p.title ? " · " : ""}${p.pin_set ? "PIN set" : '<span class="wait">Hasn\'t chosen a PIN yet</span>'}</small></div>
        <div class="tm-acts">
          <button class="btn ghost" type="button" data-act="person-edit" data-pid="${p.id}">Edit</button>
          ${p.pin_set ? `<button class="btn ghost" type="button" data-act="pin-reset" data-pid="${p.id}">Reset PIN</button>` : ""}
          ${p.id !== me.id ? `<button class="btn ghost danger-t" type="button" data-act="person-remove" data-pid="${p.id}">Remove</button>` : ""}
        </div></div>`).join("");
    openSheet({
      html: `${head("Team")}
        <p class="muted" style="margin:0">Everyone picks their own PIN the first time they tap their name. <b>Reset PIN</b> signs that person out and lets them choose a new one, for a forgotten PIN or a new phone.</p>
        <div class="team">${rows}</div>
        <button class="btn" type="button" data-act="person-edit">${I.plus}Add a person</button>`,
    });
  }

  function personSheet(p) {
    const isNew = !p;
    p = p || { name: "", initials: "", title: "", role: "member" };
    openSheet({
      html: `${head(isNew ? "Add a person" : "Edit " + esc(p.name))}
        <form novalidate>
          <label class="field"><span>Name</span><input name="name" value="${esc(p.name)}" required autocomplete="off"></label>
          <label class="field"><span>Initials</span><input name="initials" value="${esc(p.initials)}" maxlength="3" autocomplete="off"><span class="hint">2 or 3 letters, shown on venues they own.</span></label>
          <label class="field"><span>What they do</span><input name="title" value="${esc(p.title || "")}" placeholder="e.g. Introductions" autocomplete="off"></label>
          <div class="field"><span>Access</span><div class="seg">${[["member", "Member: add and edit"], ["admin", "Admin: also delete and manage team"]].map(([k, l]) => `<label><input type="radio" name="role" value="${k}" ${p.role === k ? "checked" : ""}><span>${l}</span></label>`).join("")}</div></div>
          ${isNew ? `<p class="muted" style="margin:0;font-size:13.5px">They'll appear on the sign-in screen. Send them the CRM link; the first time they tap their name they choose their own PIN.</p>` : ""}
          <p class="error" role="alert"></p>
          <button class="btn primary block" type="submit">${isNew ? "Add to the team" : "Save"}</button>
        </form>`,
      bind(sheet) {
        const f = $("form", sheet);
        f.onsubmit = e => {
          e.preventDefault();
          if (!f.name.value.trim()) { $(".error", f).textContent = "Add a name."; return; }
          guard($("button[type=submit]", f), async () => {
            await S.savePerson({ id: p.id, name: f.name.value.trim(), initials: f.initials.value.trim().toUpperCase(), title: f.title.value.trim(), role: f.role.value });
            toast(isNew ? `Added <b>${esc(f.name.value.trim())}</b>. Send them the link.` : "Saved");
            teamSheet();
          });
        };
      },
    });
  }

  let xlsxLoading = null;
  function loadXlsx() {
    if (window.XLSX) return Promise.resolve();
    return xlsxLoading = xlsxLoading || new Promise((ok, bad) => {
      const sc = document.createElement("script");
      sc.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
      sc.onload = ok; sc.onerror = () => { xlsxLoading = null; bad(new Error("Couldn't load the spreadsheet tool. Check your connection.")); };
      document.head.appendChild(sc);
    });
  }
  async function downloadBackup() {
    await loadXlsx();
    const names = new Map(S.venues.map(v => [v.id, v.name]));
    const venues = [...S.venues].sort((a, b) => a.name.localeCompare(b.name)).map(v => ({
      "Venue": v.name, "City": v.city, "Area": v.area || "", "Stage": STAGE[v.stage]?.t || v.stage, "Type": v.venue_type || "", "Group": v.grp || "",
      "Contact": v.contact_name || "", "Contact role": v.contact_role || "", "Phone": v.phone || "", "Email": v.email || "",
      "Instagram": v.instagram || "", "Website": v.website || "", "Address": v.address || "",
      "Priority": v.priority || "", "Fit": v.fit || "", "Uses today": v.current_system || "",
      "Owner": v.owner ? personName(v.owner) : "", "Introduced by": v.introducer ? personName(v.introducer) : "",
      "Next step": v.next_step || "", "Next date": v.next_date || "", "Notes": v.notes || "",
      "Last updated": stamp(v.updated_at), "Updated by": personById(v.updated_by)?.name || "", "CRM id": v.id,
    }));
    const hist = [...S.activities].sort((a, b) => (b.happened_on || "").localeCompare(a.happened_on || "")).map(a => ({
      "Date": a.happened_on, "Venue": names.get(a.venue_id) || "", "Channel": a.channel, "What happened": a.summary, "By": personName(a.author), "Venue CRM id": a.venue_id,
    }));
    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(venues), ws2 = XLSX.utils.json_to_sheet(hist);
    ws1["!cols"] = Object.keys(venues[0] || {}).map(k => ({ wch: ["Venue", "Address", "Notes", "Next step"].includes(k) ? 34 : 14 }));
    ws2["!cols"] = [{ wch: 11 }, { wch: 30 }, { wch: 11 }, { wch: 70 }, { wch: 10 }, { wch: 8 }];
    XLSX.utils.book_append_sheet(wb, ws1, "Venues");
    XLSX.utils.book_append_sheet(wb, ws2, "History");
    const name = `BottleBank-CRM-backup-${today()}.xlsx`;
    const blob = new Blob([XLSX.write(wb, { bookType: "xlsx", type: "array" })], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const file = new File([blob], name, { type: blob.type });
    const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
    if (standalone && navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: name }); return; } catch (e) { if (e.name === "AbortError") return; }
    }
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
    toast(`Downloaded <b>${esc(name)}</b>`);
  }

  /* ---------------------------------------------------------------- clicks */
  document.addEventListener("click", e => {
    const el = e.target.closest("[data-act]");
    if (!el) return;
    const act = el.dataset.act;
    const id = el.dataset.id ? Number(el.dataset.id) : null;
    const v = id ? byId(id) : null;
    switch (act) {
      case "scrim": if (e.target === el) closeSheet(); return;
      case "close": closeSheet(); return;
      case "add": editSheet(null); return;
      case "me": meSheet(); return;
      case "install": if (installEvt) { const ev = installEvt; ev.prompt(); ev.userChoice.finally(() => { installEvt = null; closeSheet(); render(); }); } return;
      case "install-hide": prefs.installHidden = true; savePrefs(); render(); return;
      case "signout": S.signOut(); return;
      case "resync": S.load().catch(() => {}); paintSync(); return;
      case "change-pin": changePinSheet(); return;
      case "backup": guard(el, async () => { el.disabled = true; try { await downloadBackup(); } finally { el.disabled = false; } }); return;
      case "team": teamSheet(); return;
      case "person-edit": personSheet(el.dataset.pid ? people().find(p => p.id === el.dataset.pid) : null); return;
      case "pin-reset": case "person-remove": {
        const p = people().find(x => x.id === el.dataset.pid); if (!p) return;
        if (!el.dataset.sure) { el.dataset.sure = "1"; el.textContent = act === "pin-reset" ? "Tap again to reset" : "Tap again to remove"; return; }
        guard(el, async () => {
          if (act === "pin-reset") { await S.resetPin(p.id); toast(`<b>${esc(p.name)}</b> can choose a new PIN next time they open the CRM.`); }
          else { await S.removePerson(p.id); toast(`Removed <b>${esc(p.name)}</b>. Their venues and history stay.`); }
          teamSheet();
        });
        return;
      }
      case "reset-demo": S.resetDemo(); toast("Preview data reset"); return;
      case "log": logSheet(v); return;
      case "stage": stageSheet(v); return;
      case "next": nextSheet(v); return;
      case "edit": editSheet(v); return;
      case "today-mine": todayMine = el.dataset.v === "1"; prefs.todayMine = todayMine; savePrefs(); render(); return;
      case "goto-stage": e.preventDefault(); Object.assign(F, { tab: tabOf(el.dataset.stage), stage: el.dataset.stage, q: "", city: "all", owner: "all", prio: "all", reach: "all", limit: 80 }); prefs.filters2 = { ...F }; savePrefs(); location.hash = "venues"; if (route().name === "venues") render(); return;
      case "vtab": F.tab = el.dataset.tab; F.stage = "all"; F.limit = 80; prefs.filters2 = { ...F }; savePrefs(); render(); return;
      case "more": F.limit += 80; renderVenueList(); return;
      case "copy": {
        const val = el.dataset.v;
        const done = () => { el.textContent = "Copied"; setTimeout(() => el.textContent = "Copy", 1500); };
        try { navigator.clipboard.writeText(val).then(done, () => toast(esc(val))); } catch (err) { toast(esc(val)); }
        return;
      }
      case "del-act": {
        const a = S.activities.find(x => x.id === id);
        if (!a) return;
        if (el.dataset.sure) { guard(el, async () => { await S.deleteActivity(id); toast("Removed"); }); }
        else { el.dataset.sure = "1"; el.textContent = "Tap again to remove"; }
        return;
      }
      case "del-venue-ask": {
        $("#del-zone").innerHTML = `<div class="confirm"><span>Delete <b>${esc(v.name)}</b> and its ${actsFor(v.id).length} history entries? This can't be undone.</span>
          <div class="actions"><button class="btn danger solid" type="button" data-act="del-venue" data-id="${v.id}">Delete for everyone</button><button class="btn" type="button" data-act="del-venue-cancel" data-id="${v.id}">Keep it</button></div></div>`;
        return;
      }
      case "del-venue-cancel": render(); return;
      case "del-venue": guard(el, async () => { const n = v.name; await S.deleteVenue(v.id); location.hash = "venues"; toast(`Deleted <b>${esc(n)}</b>`); }); return;
    }
  });
  document.addEventListener("click", e => {
    const tr = e.target.closest("tr[data-href]");
    if (tr && !e.target.closest("a, button")) location.hash = tr.dataset.href.slice(1);
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeSheet(); });

  /* ---------------------------------------------------------------- sign in + boot */
  /* Sign in: tap your name. First time you choose your own 6-digit PIN; after that you enter it.
     The PIN is that person's Supabase password; the email is only a login name. */
  const LOGIN_FALLBACK = ((window.BB_CONFIG && window.BB_CONFIG.people) || []).map(p => ({ ...p, title: p.role, pin_set: true }));
  const AV_BG = { KN: "#2DD4BF", TP: "#A7F3E4", SJ: "#F2F4F3" };
  let loginPeople = null;
  async function signInScreen(msg) {
    const frame = inner => `<div class="pin-screen gutter"><div class="pin-in">
      <span class="logo">${LOGO}<span class="tag">CRM</span></span>${inner}</div></div>`;
    if (!loginPeople) {
      app.innerHTML = frame(`<div><h1>Who's signing in?</h1><p>Loading the team…</p></div>`);
      try { loginPeople = await S.listPeople(); } catch (e) { console.error(e); loginPeople = LOGIN_FALLBACK; }
    }
    app.innerHTML = frame(`
      <div><h1>Who's signing in?</h1><p>Tap your name. The first time, you'll choose your own 6-digit PIN.</p></div>
      <div class="people">${loginPeople.map((p, i) => `<button class="person" type="button" data-person="${i}">
        <span class="pav" style="background:${AV_BG[p.initials] || "#2DD4BF"}">${esc(p.initials)}</span>
        <span><b>${esc(p.name)}</b><small>${esc(p.title || "")}${p.pin_set ? "" : `${p.title ? " · " : ""}<em>Set up your PIN</em>`}</small></span><span class="chev" aria-hidden="true">›</span></button>`).join("")}</div>
      ${msg ? `<p class="pin-err" role="alert">${esc(msg)}</p>` : ""}
      <p class="pin-foot">You only do this once. You stay signed in on this phone.</p>`);
    app.querySelectorAll("[data-person]").forEach(b => b.onclick = () => pinScreen(loginPeople[Number(b.dataset.person)]));
  }
  function pinScreen(person) {
    let pin = "", first = "", busy = false;
    let step = person.pin_set ? "enter" : "choose";      // enter | choose | confirm
    const LABEL = { enter: "Enter your PIN", choose: "Choose a 6-digit PIN", confirm: "Type the same PIN again" };
    app.innerHTML = `<div class="pin-screen gutter"><div class="pin-in">
      <span class="logo">${LOGO}<span class="tag">CRM</span></span>
      <div class="who"><span class="pav big" style="background:${AV_BG[person.initials] || "#2DD4BF"}">${esc(person.initials)}</span>
        <div><h1>Hi ${esc(person.name)}</h1><p id="pin-msg">${LABEL[step]}</p></div></div>
      <div class="dots" id="dots" aria-live="polite">${"<span class=\"dot\"></span>".repeat(6)}</div>
      <div class="pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button class="k" type="button" data-k="${n}">${n}</button>`).join("")}
        <button class="k t" type="button" data-k="back">Not you?</button><button class="k" type="button" data-k="0">0</button>
        <button class="k d" type="button" data-k="del" aria-label="Delete">⌫</button></div>
      ${step === "choose" ? `<p class="pin-foot" id="pin-foot">Pick something only you know. You won't need it again on this phone.</p>` : ""}
    </div></div>`;
    const dots = () => $("#dots").querySelectorAll(".dot").forEach((d, i) => d.classList.toggle("on", i < pin.length));
    const say = (t, bad) => { const m = $("#pin-msg"); m.textContent = t; m.classList.toggle("bad", !!bad); };
    const shake = () => { const d = $("#dots"); d.classList.remove("shake"); void d.offsetWidth; d.classList.add("shake"); };
    const done = () => { document.removeEventListener("keydown", onKey); loginPeople = null; render(); };
    async function submit() {
      if (step === "choose") { first = pin; pin = ""; step = "confirm"; dots(); return say(LABEL.confirm); }
      busy = true;
      try {
        if (step === "confirm") {
          if (pin !== first) { busy = false; pin = ""; first = ""; step = "choose"; dots(); shake(); return say("Those didn't match. Choose your PIN again.", true); }
          say("Saving your PIN…");
          const ok = await S.firstPin(person.email, pin);
          if (!ok) { busy = false; pin = ""; step = "enter"; person.pin_set = true; dots(); return say("A PIN is already set for you. Enter it.", true); }
          await S.signIn(person.email, pin);
          done(); toast("PIN saved. You'll stay signed in on this phone.");
          return;
        }
        say("Signing in…");
        await S.signIn(person.email, pin);
        done();
      } catch (e) {
        busy = false; pin = ""; dots(); shake();
        if (step === "confirm") { step = "choose"; first = ""; }
        say(e.message || "Something went wrong. Try again.", true);
      }
    }
    const press = k => {
      if (busy) return;
      if (k === "back") { document.removeEventListener("keydown", onKey); return signInScreen(); }
      if (k === "del") { pin = pin.slice(0, -1); return dots(); }
      if (pin.length >= 6) return;
      pin += k; dots();
      if (pin.length === 6) setTimeout(submit, 120);
    };
    const onKey = e => { if (/^[0-9]$/.test(e.key)) press(e.key); else if (e.key === "Backspace") press("del"); else if (e.key === "Escape") press("back"); };
    document.addEventListener("keydown", onKey);
    app.querySelectorAll("[data-k]").forEach(b => b.onclick = () => press(b.dataset.k));
  }

  // Only redraw the screen when the data actually changed; a sync tick just updates the pill.
  let lastKey = "";
  const dataKey = () => {
    let mu = ""; for (const v of S.venues) if ((v.updated_at || "") > mu) mu = v.updated_at;
    let ma = 0; for (const a of S.activities) if (a.id > ma) ma = a.id;
    return [S.venues.length, mu, S.activities.length, ma, (S.people || []).map(p => p.id + p.name + p.role + p.pin_set).join(), S.me && S.me.id, S.online].join("|");
  };
  S.onChange(() => {
    if (!S.me) return;
    paintSync();
    const key = dataKey();
    if (key === lastKey && $("#view")) return;
    lastKey = key;
    const y = window.scrollY;
    const r = route();
    const qFocused = document.activeElement && document.activeElement.id === "q";
    if (r.name === "venues" && $("#vlist")) { renderVenueList(); return; }
    if (qFocused) return;
    render(); window.scrollTo(0, y);
  });

  (async function boot() {
    app.innerHTML = `<div class="loading">Loading…</div>`;
    try {
      const ok = await S.init();
      if (!ok) return signInScreen();
      render();
    } catch (e) {
      console.error(e);
      if (S.mode === "demo") app.innerHTML = `<div class="loading gutter">${esc(e.message)}</div>`;
      else signInScreen(e.message);
    }
    if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost") && S.mode !== "demo") {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    }
  })();
})();
