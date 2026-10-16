# The Loc Party

A mobile-first PWA for The Loc Party: email check-in, points, bingo, venue, and an admin console. Built with React + Vite, backed by Supabase (Postgres + Auth + Storage + Realtime). Guest phones and the admin console share the same live data.

## Run it

```bash
npm install
npm run dev      # local dev server, prints a URL to open on your phone (same network) or in a browser
npm run build    # production build to dist/
npm run preview  # serve the production build locally
```

To test the guest flow on a phone: run `npm run dev -- --host`, then open the printed network URL from the phone's browser (same Wi-Fi). The phone has to reach the API URL in `.env`.

## Backend: Supabase

Schema lives in `supabase/migrations`. Apply those migrations to the Supabase project this app should use.

- **Guests** sign up and sign in with email and password. The session stays on the device, and the same email and password work on another phone. If the project requires email confirmation, signup finishes only after that confirmation creates a session.
- **Admin** is an email/password account that is already in the `admins` table. The console does not offer account creation. Row Level Security, not the screen, decides what that account can read and write.
- **Points and raffle rows** are granted by the database. Guests cannot insert their own totals.
- **Realtime**: schedule, venue, vendors, announcements, and points push to connected phones without an app update.
- **Photos**: profile photos go to the `party-photos` Storage bucket, resized on the phone first.

### Environment variables

Required in `.env`:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

The anon key is the publishable key. Do not put a service-role key here.

## What guests see

Bingo, venue areas, vendors, the schedule, announcements, points, and the leaderboard. Party groups are assigned in join order, five groups, then the rotation starts over.

The scavenger hunt, raffle, prizes, and unlocked surprises are hidden. Opening those addresses sends the guest back to the party.

## Editing content without touching code

Schedule, venue areas, vendors, and announcements are edited from the admin console at `/admin`. Saves show up on guest phones immediately. `src/data/config.js` holds structural labels (relationship statuses, proof types, unlock types), not the night's copy.

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
  screens/admin/         admin console (guests, bingo, schedule, draw, submissions, settings, etc.)
```

## Admin capabilities

- **Overview**: live guest count, total points, pending submissions, anonymous relationship-status group totals.
- **Guests**: search the roster. Points are visible. Guest emails are on the draw list, not on this roster.
- **Bingo**: the live board and booth/game rotation. Guests keep the card they were dealt.
- **Schedule / Venue / Vendors / Announcements**: edit what guests see, live.
- **Draw**: spin the next winner. Tickets are points divided by 50, rounded down. A guest can win once. The list is spin order, with name and email, so prizes can be matched in person.
- **Submissions**: approve or reject photo, video, and written proofs. Approving awards that challenge's points.
- **Settings**: point values, relationship-status colors, and a JSON export of live data.
