# The Loc Party

A mobile-first PWA guest-journey app: QR entry → quick profile → points/raffle → scavenger-hunt engine → admin console. Built with React + Vite, backed by a real Supabase database (Postgres + Auth + Storage + Realtime) — every guest device and the admin console share the same live data.

## Run it

```bash
npm install
npm run dev      # local dev server, prints a URL to open on your phone (same network) or in a browser
npm run build    # production build to dist/
npm run preview  # serve the production build locally
```

To test the real guest flow on your phone: run `npm run dev -- --host`, then open the printed network URL from your phone's browser (same Wi-Fi). That's the same experience a QR code would launch.

To ship a live URL you can put behind a QR code, drag the `dist/` folder onto https://app.netlify.com/drop, or connect this folder to Netlify/Vercel. Set the two environment variables below in whatever host you deploy to.

## Backend: Supabase

This app talks to a dedicated Supabase project — no other app shares it.

- **Guests** never see a login. On first visit the app creates an anonymous Supabase Auth session on their device and a matching row in the `guests` table tied to that session.
- **Admin** uses a real email/password account (Supabase Auth, non-anonymous). The first time you open `/admin`, tap "First time? Create an admin account" to set one up; after that, sign in normally. Anyone who doesn't have the admin email/password cannot reach admin data — Row Level Security enforces this at the database level, not just in the UI.
- **Realtime**: content edits (challenges, vendors, announcements, raffle status, point values, theme colors) and new points/entries/submissions push to every connected guest and to the admin console instantly — no refresh needed.
- **Photos**: profile photos and "Loc Party look" uploads go to a Supabase Storage bucket (`party-photos`), resized client-side first.

### Environment variables

Required in `.env` (already present in this project, safe to commit — it's the publishable key, not a secret):

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

If you ever need to point this app at a different Supabase project, get these two values from Supabase → Project Settings → API and swap them in.

## Editing content without touching code

Everything guests see — challenges, vendors, schedule, announcements, prizes, raffle rules, point values, accent colors — is editable live from the **Admin console** at `/admin`. Changes save straight to the database and reach every guest's phone in real time. `src/data/config.js` still holds a few structural enums used to build admin forms (relationship-status labels, proof types, unlock types, challenge categories) — not event content.

## Structure

```
src/
  data/config.js        enum/label lists for admin forms (not event content)
  lib/
    supabaseClient.js    two isolated Supabase client instances (guest vs. admin, separate sessions)
    api.js               every database read/write lives here; screens never touch Supabase directly
    unlock.js             scavenger-hunt unlock-rule engine (pure function, backend-agnostic)
    image.js              client-side photo resizing before upload
  state/
    AppState.jsx          guest-facing app state + actions, wraps the whole app
    AdminState.jsx         admin auth + live cross-guest data + admin mutation actions, wraps /admin
  components/            shared UI: nav, cards, celebration/confetti, theming
  screens/               guest-facing screens
  screens/admin/         admin console (challenges, vendors, raffle, submissions, settings, etc.)
```

## Admin capabilities

- **Overview**: live guest count, total points/entries, pending submissions, anonymous relationship-status group totals, per-challenge completion counts.
- **Challenges / Vendors / Schedule / Announcements / Prizes**: full CRUD, reflected live.
- **Raffle**: open/close/reopen, draw a winner (server-side, atomic — can't be drawn twice or by a non-admin), announce the winner in-app, reset entries.
- **Submissions**: approve/reject pending proof submissions; approving awards the challenge's points/entries automatically.
- **Settings**: point values, per-relationship-status accent colors, and a one-click JSON export of all live data.
