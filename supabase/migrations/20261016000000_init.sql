-- Freizeitliga München: leagues, teams, fixtures, results, accounts, training RSVPs,
-- game moves and live games. Everything the site reads is public; every write is
-- checked here, in row-level security and triggers, never only in the client.
--
-- Rights (per team member): 'Ergebnisse', 'Team bearbeiten', 'Spielverlegung', 'Rechte vergeben'.
-- Staffelleitung: rows in league_admins (league_id null = every league).

-- ───────────────────────── League data ─────────────────────────

create table public.leagues (
  id    text primary key,
  tier  smallint not null check (tier between 1 and 9),
  label text not null,
  lead  text not null default '',
  sort  smallint not null
);

create table public.teams (
  id        text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  league_id text not null references public.leagues on update cascade,
  name      text not null unique,
  short     text not null,
  club      text,
  hue       smallint not null default 0 check (hue between 0 and 359),
  venues    text[] not null default '{}',
  -- [{ "day": 0..6 (Mo..So), "from": "20:00", "to": "22:00" }]
  slots     jsonb not null default '[]' check (jsonb_typeof(slots) = 'array'),
  contacts  text[] not null default '{}'
);
create index on public.teams (league_id);

-- Best of three: sets to 25, decider to 15, win by two; over the target a set ends at
-- exactly two points apart. Mirrors validateSet() in src/pages/MyTeam.tsx.
create function public.valid_sets(s jsonb) returns boolean
language plpgsql immutable as $$
declare
  n int;
  i int;
  h int;
  a int;
  target int;
  won int[] := array[0, 0];
begin
  if s is null or jsonb_typeof(s) <> 'array' then return false; end if;
  n := jsonb_array_length(s);
  if n not between 2 and 3 then return false; end if;
  for i in 0 .. n - 1 loop
    -- a set after the match is decided is not allowed
    if won[1] = 2 or won[2] = 2 then return false; end if;
    if jsonb_typeof(s -> i) <> 'array' or jsonb_array_length(s -> i) <> 2
       or jsonb_typeof(s -> i -> 0) <> 'number' or jsonb_typeof(s -> i -> 1) <> 'number' then
      return false;
    end if;
    h := (s -> i ->> 0)::int;
    a := (s -> i ->> 1)::int;
    if h < 0 or a < 0 then return false; end if;
    target := case when i = 2 then 15 else 25 end;
    if greatest(h, a) < target or abs(h - a) < 2 then return false; end if;
    if greatest(h, a) > target and abs(h - a) <> 2 then return false; end if;
    if h > a then won[1] := won[1] + 1; else won[2] := won[2] + 1; end if;
  end loop;
  return won[1] = 2 or won[2] = 2;
exception when others then
  return false;
end $$;

create table public.matches (
  id        text primary key,
  no        int not null,
  league_id text not null references public.leagues on update cascade,
  home_id   text not null references public.teams on update cascade,
  away_id   text not null references public.teams on update cascade,
  -- local (Europe/Berlin) date and start time, as the site shows them
  date      date not null,
  time      time not null,
  venue     text not null,
  -- [[25, 21], [22, 25], [15, 12]], home score first
  sets      jsonb check (sets is null or public.valid_sets(sets)),
  result_by uuid references auth.users on delete set null,
  result_at timestamptz,
  check (home_id <> away_id),
  unique (league_id, no)
);
create index on public.matches (home_id);
create index on public.matches (away_id);
create index on public.matches (date);

-- ───────────────────────── People ─────────────────────────

create table public.profiles (
  id   uuid primary key references auth.users on delete cascade,
  name text not null default '' check (length(name) <= 80)
);

create table public.team_members (
  team_id  text not null references public.teams on update cascade on delete cascade,
  -- profiles, not auth.users, so the API can embed names: team_members?select=*,profiles(name)
  user_id  uuid not null references public.profiles on delete cascade,
  number   smallint check (number between 0 and 99),
  position text check (position in ('Zuspiel', 'Außen', 'Mitte', 'Diagonal', 'Libero')),
  office   text check (length(office) <= 40),
  rights   text[] not null default '{}'
           check (rights <@ array['Ergebnisse', 'Team bearbeiten', 'Spielverlegung', 'Rechte vergeben']),
  joined_at timestamptz not null default now(),
  primary key (team_id, user_id)
);
create index on public.team_members (user_id);

create table public.league_admins (
  user_id   uuid not null references auth.users on delete cascade,
  -- null: every league
  league_id text references public.leagues on update cascade on delete cascade,
  unique nulls not distinct (user_id, league_id)
);

-- ───────────────────────── Rights helpers ─────────────────────────
-- security definer so policies can look at team_members without recursing into its own RLS.

create function public.is_member(team text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from team_members where team_id = team and user_id = auth.uid())
$$;

create function public.has_right(team text, r text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from team_members where team_id = team and user_id = auth.uid() and r = any (rights))
$$;

create function public.is_league_admin(league text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from league_admins
    where user_id = auth.uid() and (league_id is null or league_id = league)
  )
$$;

create function public.shares_team(other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from team_members a join team_members b using (team_id)
    where a.user_id = auth.uid() and b.user_id = other
  )
$$;

-- Requests through the API run as anon or authenticated (PostgREST sets the role); migrations,
-- the dashboard and service-role scripts are trusted and skip the guards below. Reads the role
-- setting, not current_user, which is the owner inside security definer functions.
create function public.is_api_user() returns boolean
language sql stable as $$
  select coalesce(nullif(current_setting('role', true), 'none'), current_user) in ('anon', 'authenticated')
$$;

create function public.kickoff(m public.matches) returns timestamptz
language sql stable as $$
  select (m.date + m.time) at time zone 'Europe/Berlin'
$$;

-- ───────────────────────── Results ─────────────────────────

-- Home team members with "Ergebnisse" enter a result once, after kickoff; corrections and
-- schedule changes are for the Staffelleitung.
create function public.matches_guard() returns trigger
language plpgsql as $$
begin
  if not public.is_api_user() or public.is_league_admin(old.league_id) then
    if new.sets is distinct from old.sets then
      new.result_by := auth.uid();
      new.result_at := now();
    end if;
    return new;
  end if;
  if (new.id, new.no, new.league_id, new.home_id, new.away_id, new.date, new.time, new.venue)
     is distinct from (old.id, old.no, old.league_id, old.home_id, old.away_id, old.date, old.time, old.venue) then
    raise exception 'Nur die Staffelleitung kann Spieldaten ändern.' using errcode = '42501';
  end if;
  if old.sets is not null then
    raise exception 'Das Ergebnis ist schon eingetragen. Korrekturen über die Staffelleitung.' using errcode = '42501';
  end if;
  if new.sets is null then
    return new;
  end if;
  if public.kickoff(old) > now() then
    raise exception 'Das Spiel hat noch nicht begonnen.' using errcode = '22023';
  end if;
  new.result_by := auth.uid();
  new.result_at := now();
  return new;
end $$;

create trigger matches_guard before update on public.matches
  for each row execute function public.matches_guard();

-- ───────────────────────── Team members ─────────────────────────

create function public.team_members_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  t text := coalesce(old.team_id, new.team_id);
begin
  if public.is_api_user() then
    if tg_op = 'UPDATE' then
      if new.team_id <> old.team_id or new.user_id <> old.user_id then
        raise exception 'Mitgliedschaft kann nicht umgehängt werden.' using errcode = '42501';
      end if;
      if new.rights is distinct from old.rights and not public.has_right(t, 'Rechte vergeben') then
        raise exception 'Dafür brauchst du das Recht „Rechte vergeben“.' using errcode = '42501';
      end if;
      if (new.number, new.position, new.office) is distinct from (old.number, old.position, old.office)
         and old.user_id <> auth.uid() and not public.has_right(t, 'Team bearbeiten') then
        raise exception 'Dafür brauchst du das Recht „Team bearbeiten“.' using errcode = '42501';
      end if;
    end if;
    -- a team never loses its last person who can hand out rights
    if 'Rechte vergeben' = any (old.rights)
       and (tg_op = 'DELETE' or not 'Rechte vergeben' = any (new.rights))
       and not exists (
         select 1 from team_members
         where team_id = t and user_id <> old.user_id and 'Rechte vergeben' = any (rights)
       ) then
      raise exception 'Mindestens eine Person im Team muss „Rechte vergeben“ behalten.' using errcode = '23514';
    end if;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;

create trigger team_members_guard before update or delete on public.team_members
  for each row execute function public.team_members_guard();

-- Invites: someone with "Rechte vergeben" creates a code, a new account redeems it.
create table public.team_invites (
  code       text primary key default substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
  team_id    text not null references public.teams on update cascade on delete cascade,
  rights     text[] not null default '{}'
             check (rights <@ array['Ergebnisse', 'Team bearbeiten', 'Spielverlegung', 'Rechte vergeben']),
  created_by uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '14 days',
  max_uses   int not null default 20 check (max_uses between 1 and 100),
  uses       int not null default 0
);

create function public.join_team(invite text) returns text
language plpgsql security definer set search_path = public as $$
declare
  inv team_invites;
begin
  if auth.uid() is null then
    raise exception 'Bitte zuerst anmelden.' using errcode = '42501';
  end if;
  select * into inv from team_invites where code = lower(trim(invite)) for update;
  if not found or inv.expires_at < now() or inv.uses >= inv.max_uses then
    raise exception 'Der Einladungscode ist ungültig oder abgelaufen.' using errcode = '22023';
  end if;
  insert into team_members (team_id, user_id, rights)
  values (inv.team_id, auth.uid(), inv.rights)
  on conflict (team_id, user_id) do nothing;
  if found then
    update team_invites set uses = uses + 1 where code = inv.code;
  end if;
  return inv.team_id;
end $$;

-- New accounts get a profile; the name comes from the sign-up form.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, name)
  values (new.id, left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1), ''), 80));
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────────────────── Training ─────────────────────────

-- Sessions follow the team's hall slots, so a session is just (team, date).
-- Past "ja" answers count as attendance.
create table public.training_rsvps (
  team_id      text not null references public.teams on update cascade on delete cascade,
  session_date date not null,
  user_id      uuid not null default auth.uid() references auth.users on delete cascade,
  answer       text not null check (answer in ('ja', 'vielleicht', 'nein')),
  updated_at   timestamptz not null default now(),
  primary key (team_id, session_date, user_id)
);

-- ───────────────────────── Game moves ─────────────────────────

create table public.move_requests (
  id           bigint generated always as identity primary key,
  match_id     text not null references public.matches on update cascade on delete cascade,
  team_id      text not null references public.teams on update cascade on delete cascade,
  requested_by uuid not null default auth.uid() references auth.users on delete cascade,
  proposed_at  timestamptz not null,
  reason       text not null default '' check (length(reason) <= 500),
  status       text not null default 'offen' check (status in ('offen', 'genehmigt', 'abgelehnt')),
  created_at   timestamptz not null default now()
);
create index on public.move_requests (team_id);

-- Two moves per team and season; rejected requests do not count.
create function public.move_requests_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_api_user() and not public.is_league_admin((select league_id from matches where id = new.match_id)) then
    if tg_op = 'UPDATE' then
      raise exception 'Nur die Staffelleitung entscheidet über Verlegungen.' using errcode = '42501';
    end if;
    if (select count(*) from move_requests where team_id = new.team_id and status <> 'abgelehnt') >= 2 then
      raise exception 'Pro Saison sind zwei Verlegungen erlaubt.' using errcode = '23514';
    end if;
  end if;
  return new;
end $$;

create trigger move_requests_guard before insert or update on public.move_requests
  for each row execute function public.move_requests_guard();

-- ───────────────────────── Live games ─────────────────────────

-- A live game is its rally list; scores are derived in the client (src/live/engine.ts).
create table public.live_games (
  match_id    text primary key references public.matches on update cascade on delete cascade,
  -- [{ "s": "home" | "away", "t": epoch ms }]
  rallies     jsonb not null default '[]'
              check (jsonb_typeof(rallies) = 'array' and jsonb_array_length(rallies) <= 250),
  status      text not null default 'live' check (status in ('live', 'final')),
  started_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  reporter    text not null default '' check (length(reporter) <= 80),
  reporter_id uuid not null default auth.uid() references auth.users on delete cascade
);

-- Only the home team, with "Ergebnisse", while the game has no result, from the day before kickoff.
create function public.can_report_live(match text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from matches m
    where m.id = match
      and m.sets is null
      and public.has_right(m.home_id, 'Ergebnisse')
      and public.kickoff(m) < now() + interval '1 day'
  )
$$;

-- When the result is in, a live game of that match is over.
create function public.matches_finish_live() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update live_games set status = 'final', updated_at = now() where match_id = new.id and status = 'live';
  return null;
end $$;

create trigger matches_finish_live after update of sets on public.matches
  for each row when (new.sets is not null and old.sets is null) execute function public.matches_finish_live();

-- ───────────────────────── Row-level security ─────────────────────────

alter table public.leagues        enable row level security;
alter table public.teams          enable row level security;
alter table public.matches        enable row level security;
alter table public.profiles       enable row level security;
alter table public.team_members   enable row level security;
alter table public.league_admins  enable row level security;
alter table public.team_invites   enable row level security;
alter table public.training_rsvps enable row level security;
alter table public.move_requests  enable row level security;
alter table public.live_games     enable row level security;

-- public reading
create policy "public read" on public.leagues    for select using (true);
create policy "public read" on public.teams      for select using (true);
create policy "public read" on public.matches    for select using (true);
create policy "public read" on public.live_games for select using (true);

-- teams: own team data with "Team bearbeiten"
create policy "edit own team" on public.teams for update to authenticated
  using (public.has_right(id, 'Team bearbeiten') or public.is_league_admin(league_id))
  with check (public.has_right(id, 'Team bearbeiten') or public.is_league_admin(league_id));

-- matches: results for own home games (rules in matches_guard)
create policy "home team enters result" on public.matches for update to authenticated
  using ((sets is null and public.has_right(home_id, 'Ergebnisse')) or public.is_league_admin(league_id))
  with check (public.has_right(home_id, 'Ergebnisse') or public.is_league_admin(league_id));
create policy "staffelleitung plans games" on public.matches for insert to authenticated
  with check (public.is_league_admin(league_id));
create policy "staffelleitung removes games" on public.matches for delete to authenticated
  using (public.is_league_admin(league_id));

-- profiles: yourself and your teammates
create policy "own and teammates" on public.profiles for select to authenticated
  using (id = auth.uid() or public.shares_team(id));
create policy "edit own profile" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- team members: visible inside the team; rights and squad edits checked in team_members_guard
create policy "team sees squad" on public.team_members for select to authenticated
  using (public.is_member(team_id) or public.is_league_admin((select league_id from public.teams where id = team_id)));
create policy "edit squad" on public.team_members for update to authenticated
  using (user_id = auth.uid() or public.has_right(team_id, 'Rechte vergeben') or public.has_right(team_id, 'Team bearbeiten'))
  with check (public.is_member(team_id));
create policy "leave or remove" on public.team_members for delete to authenticated
  using (user_id = auth.uid() or public.has_right(team_id, 'Team bearbeiten'));
create policy "staffelleitung adds members" on public.team_members for insert to authenticated
  with check (public.is_league_admin((select league_id from public.teams where id = team_id)));

create policy "see own admin rows" on public.league_admins for select to authenticated
  using (user_id = auth.uid());

-- invites
create policy "manage invites" on public.team_invites for all to authenticated
  using (public.has_right(team_id, 'Rechte vergeben'))
  with check (public.has_right(team_id, 'Rechte vergeben') and created_by = auth.uid());

-- training: team reads, everyone answers for themselves
create policy "team sees answers" on public.training_rsvps for select to authenticated
  using (public.is_member(team_id));
create policy "answer for yourself" on public.training_rsvps for insert to authenticated
  with check (user_id = auth.uid() and public.is_member(team_id));
create policy "change own answer" on public.training_rsvps for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and public.is_member(team_id));
create policy "withdraw own answer" on public.training_rsvps for delete to authenticated
  using (user_id = auth.uid());

-- game moves: own home games with "Spielverlegung"
create policy "team and staffelleitung see moves" on public.move_requests for select to authenticated
  using (public.is_member(team_id) or public.is_league_admin((select league_id from public.matches where id = match_id)));
create policy "request move" on public.move_requests for insert to authenticated
  with check (
    requested_by = auth.uid() and status = 'offen'
    and public.has_right(team_id, 'Spielverlegung')
    and exists (select 1 from public.matches m where m.id = match_id and m.home_id = team_id and m.sets is null)
  );
create policy "staffelleitung decides moves" on public.move_requests for update to authenticated
  using (public.is_league_admin((select league_id from public.matches where id = match_id)));

-- live games
create policy "home team reports live" on public.live_games for insert to authenticated
  with check (reporter_id = auth.uid() and public.can_report_live(match_id));
create policy "home team updates live" on public.live_games for update to authenticated
  using (public.can_report_live(match_id))
  with check (public.can_report_live(match_id));
create policy "home team cancels live" on public.live_games for delete to authenticated
  using (public.can_report_live(match_id));

-- ───────────────────────── Privileges ─────────────────────────
-- Supabase grants everything to anon and authenticated by default; narrow that down so
-- RLS is the second line, not the only one.

revoke insert, update, delete, truncate on all tables in schema public from anon;
revoke update, truncate on all tables in schema public from authenticated;
grant update (club, venues, slots, contacts)     on public.teams        to authenticated;
grant update (sets, date, time, venue)           on public.matches      to authenticated;
grant update (name)                              on public.profiles     to authenticated;
grant update (number, position, office, rights)  on public.team_members to authenticated;
-- all columns, because the client upserts (insert … on conflict do update); RLS keeps it to your own row
grant update (team_id, session_date, user_id, answer, updated_at) on public.training_rsvps to authenticated;
grant update (status)                            on public.move_requests to authenticated;
grant update (rallies, status, updated_at, reporter) on public.live_games to authenticated;
revoke insert, delete on public.leagues, public.teams, public.profiles, public.league_admins from authenticated;

revoke execute on function public.join_team(text) from public, anon;
grant execute on function public.join_team(text) to authenticated;

-- ───────────────────────── Realtime ─────────────────────────

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.live_games, public.matches;
  end if;
end $$;
