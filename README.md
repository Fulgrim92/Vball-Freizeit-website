# Volleyball Freizeitliga München · Redesign

A from-scratch redesign of [volleyball-freizeit.de](https://www.volleyball-freizeit.de/), the Munich recreational volleyball league site (run on dieLiga). This is a front-end prototype with realistic mock data and a working mock login.

## Stack

- **Vite + React 19 + TypeScript**, `HashRouter`
- **three.js**: the hero volleyball, drawn entirely in a GLSL shader (six panels, three strips each, stitched seams), tilts toward the cursor and "spikes" on click
- **GSAP**: ball drop and spike, count-ups, celebration bursts
- **Framer Motion**: page transitions, shared-layout indicators (nav, tabs, league picker), animated table re-ordering, list enter/exit
- **Canvas 2D** backdrop: a sports hall at night (breathing ceiling lamps, drifting dust, a perspective court and swaying net, an occasional serve arcing across). Reacts to pointer and scroll, pauses when the tab is hidden, honours `prefers-reduced-motion`
- Fonts: Big Shoulders Display (scoreboard headings), Figtree (body), IBM Plex Mono (labels)

## Pages

| Route | What it does |
|---|---|
| `/` | Hero, live results ticker, this week's fixtures (filter by league), season stats, league pyramid (promotion/relegation), training teaser, community news |
| `/live` | Live ticker: scoreboard cards per running game (set columns, current set, serve, set/match ball, point-by-point feed), recently finished games, countdown for games about to start |
| `/tabellen/:liga` | All 15 leagues (1, 2A–B, 3A–C, 4A–D, 5A–E). Standings with promotion/relegation zones, points bars, form; schedule with upcoming/results/all and team filter; hovering a team highlights its games |
| `/mannschaften`, `/mannschaften/:id` | Searchable team grid with tilt cards; team page with rank, set ratio, hall time, contact, games |
| `/termine` | Tournaments with free spots and "Interesse melden", league dates |
| `/community` | Spielerbörse and forum |
| `/infos` | FAQ, documents, contact |
| `/login` | Mock login (`demo` / `volley`, or tap "Demo-Zugang einsetzen"), password reset view |
| `/mein-team` | Logged-in area for Spartak Au: next match countdown, next training RSVP, attendance rings, mini table; **Training** (RSVP per session with quorum of 6, attendance matrix and trend); **Ergebnisse** (enter set scores with validation and live table impact, request a home-game move); **Live** (count your home game point by point from a phone; only for people with the „Ergebnisse“ right; when decided, the result goes into the table); **Kader & Rechte** (grant/revoke rights) |

`⌘K` / `Ctrl+K` opens a search palette for teams, leagues and pages. Light, dark and system themes.

## Data

`src/data/season.ts` builds a deterministic season: Liga 1 uses the real team names from the 2026/27 table, all other teams are invented. Matches are a double round robin; games before "now" get rally-by-rally simulated results (best of three, winner 2 points, 1:2 loser 1 point). Login state, entered results and RSVPs are kept in `localStorage`.

## Live ticker

`src/live/` holds the live layer. A game is stored as its list of rallies; score, sets, serve and feed are derived (`engine.ts`), so undo is just dropping the last rally. `transport.ts` defines a `LiveTransport` interface; the demo implementation shares games between tabs with `localStorage` + `BroadcastChannel`. A real backend (websocket, Supabase realtime) implements the same interface and must enforce the „Ergebnisse“ right server-side. Three games from other leagues are simulated from a seed and a shared start time, so every tab shows the same score; they loop every 40 minutes.

## Backend

With `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` set (see `.env.example`), the site loads leagues, teams and games from Supabase, uses real accounts (sign-up, password reset, invite codes) and syncs the live ticker over Supabase realtime. Rights are enforced with row-level security. Without the keys it stays the demo above. Setup, rights and tests: [`supabase/README.md`](supabase/README.md).

## Scripts

```bash
npm install
npm run dev              # local dev server
npm run build            # type-check + production build to dist/
npm run build:artifact   # single-file build used for the hosted preview
npm run test:db          # migrations + seed + RLS tests on a throwaway Postgres
npm run db:seed          # regenerate supabase/seed.sql from src/data/season.ts
```
