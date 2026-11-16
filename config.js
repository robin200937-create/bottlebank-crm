/* Supabase details (Project Settings → API). The anon key is meant to be public:
   the database only lets the three logins below in (see setup/1-schema.sql). */
window.BB_CONFIG = {
  url: "https://ffwfrdtfgaocmnawzpgi.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmd2ZyZHRmZ2FvY21uYXd6cGdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ4Mzk1NjIsImV4cCI6MjExMDQxNTU2Mn0.qx6ic25czqrEnvLmjApSaDX4ldlUK32xRSINPbbbP9o",  // the "anon public" key
  // Who can sign in. Each PIN is that person's Supabase password; the email is only a login name.
  people: [
    { name: "Kanesh",  initials: "KN", role: "Admin",            email: "kanesh@crm.bottlebank.io" },
    { name: "Theepan", initials: "TP", role: "Product and tech", email: "theepan@crm.bottlebank.io" },
    { name: "Sanjay",  initials: "SJ", role: "Introductions",    email: "sanjay@crm.bottlebank.io" },
  ],
};
