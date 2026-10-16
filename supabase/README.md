# Backend (Supabase)

The site runs on Supabase when `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set at build time, and on the bundled demo data otherwise (the shareable preview stays a demo).

| What | Where |
|---|---|
| Schema, rights, row-level security, realtime | `migrations/20261016000000_init.sql` |
| Leagues, 116 teams and the 784 fixtures from `src/data/season.ts` | `seed.sql` (regenerate with `npm run db:seed`, add `-- --demo-results` for the simulated results) |
| RLS tests on plain Postgres | `tests/rls_test.sql`, run with `npm run test:db` (needs `initdb`/`pg_ctl`/`psql`, not as root) |
| Client | `src/backend/remote.ts`, loaded only when the keys are set |

## Who may do what

Enforced in the database, so a modified client can't get around it.

| Action | Allowed for |
|---|---|
| Read leagues, teams, games, results, live games | everyone, logged in or not |
| Enter a result | members of the **home** team with „Ergebnisse“, once, after kickoff |
| Correct a result, move or add games, decide on move requests | Staffelleitung (`league_admins`) of that league |
| Count a game live | home team with „Ergebnisse“, from a day before kickoff until the result is in; the result ends the live game |
| Grant or take rights | members with „Rechte vergeben“; the last one can't remove it from themselves |
| Edit squad entries (number, position, office) | yourself, or „Team bearbeiten“ |
| Edit the team's halls, club, contacts | „Team bearbeiten“ |
| Request a home-game move | „Spielverlegung“, two per season |
| Create invite codes | „Rechte vergeben“ (14 days, 20 uses) |
| See the squad, training answers | members of the team |

## Setting it up

1. Create a project on [supabase.com](https://supabase.com) (region Frankfurt).
2. Apply the schema and data, either in the dashboard's SQL editor (paste the migration, then `seed.sql`) or with the CLI:
   ```bash
   npx supabase link --project-ref <ref>
   npx supabase db push
   psql "<connection string>" -f supabase/seed.sql
   ```
3. Authentication → URL configuration: set the site URL to where the site is hosted and add it to the redirect URLs (sign-up confirmation and password reset links come back to `…/#/mein-team` and `…/#/login`).
4. Copy `.env.example` to `.env.local` and fill in Project Settings → API (URL and the `anon` public key), then `npm run dev` or `npm run build`. For a hosted build, provide the same two variables to the build.
5. Give each team its first captain once they have signed up (SQL editor):
   ```sql
   insert into team_members (team_id, user_id, rights)
   select 'spartak-au', id, '{Ergebnisse,"Team bearbeiten",Spielverlegung,"Rechte vergeben"}'
   from auth.users where email = 'captain@example.com';
   ```
   From then on the captain invites the rest under Mein Team → Kader & Rechte → Einladen. Staffelleitung: `insert into league_admins (user_id, league_id) select id, '1' from auth.users where email = '…';` (`league_id` null for every league).

## Notes

- The anon key is public by design; everything above holds with it. Never put the `service_role` key in the site.
- Training sessions follow the team's hall slots; a past „ja“ counts as attendance.
- A person in several teams sees their first team in Mein Team.
