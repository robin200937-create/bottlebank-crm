# BottleBank CRM

The sales CRM for BottleBank: every venue in Singapore and KL, where each one stands, what they said, and what happens next.
Kanesh, Theepan and Sanjay each have a login. Only Kanesh can delete venues.

Built as a phone-friendly web app (PWA) on **GitHub Pages** (hosting) and **Supabase** (database and logins), both on free plans.

## Files

| File | What it is |
|---|---|
| `index.html` | The page |
| `app.js` | Screens: Today, Venues, venue page, How it works |
| `store.js` | Saves and loads data from Supabase |
| `styles.css` | BottleBank look (Ink, Off-white, Mint; Manrope) |
| `config.js` | Your Supabase address and public key |
| `manifest.webmanifest`, `sw.js` | Makes it installable on phones |

The database setup files (`1-schema.sql`, `2-users.sql`, `3-starting-data.sql`) are kept **outside** this folder on purpose.
`3-starting-data.sql` holds venue contacts, so it never goes on GitHub.

## Updating the app

Edit the files, commit, push. GitHub Pages republishes in about a minute. Phones pick up the new version the next time the app is opened.
