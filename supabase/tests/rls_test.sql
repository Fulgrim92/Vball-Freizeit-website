-- Row-level security tests. Run with scripts/test-db.sh (plain Postgres + supabase_stub.sql,
-- migrations, seed). Everything happens in one transaction that is rolled back at the end.
\set ON_ERROR_STOP 1
\set QUIET 1

begin;

create schema test;
grant usage on schema test to anon, authenticated;

-- Run a statement as the current role; it must succeed and, for DML, touch at least one row.
create function test.ok(label text, stmt text) returns void language plpgsql as $$
declare n int;
begin
  execute stmt;
  get diagnostics n = row_count;
  if n = 0 then raise exception 'FAIL %: no rows affected', label; end if;
  raise notice 'ok   %', label;
exception when others then
  if sqlerrm like 'FAIL %' then raise; end if;
  raise exception 'FAIL %: %', label, sqlerrm;
end $$;

-- The statement must fail, or (as RLS does for update/delete) silently touch no rows.
create function test.denied(label text, stmt text) returns void language plpgsql as $$
declare n int;
begin
  begin
    execute stmt;
    get diagnostics n = row_count;
  exception when others then
    raise notice 'ok   % (%)', label, sqlerrm;
    return;
  end;
  if n > 0 then raise exception 'FAIL %: % rows affected', label, n; end if;
  raise notice 'ok   % (no rows)', label;
end $$;

create function test.count_is(label text, query text, expected int) returns void language plpgsql as $$
declare n int;
begin
  execute 'select count(*) from (' || query || ') q' into n;
  if n <> expected then raise exception 'FAIL %: expected % rows, got %', label, expected, n; end if;
  raise notice 'ok   %', label;
end $$;

create function test.uid(who text) returns uuid language sql security definer as $$
  select id from auth.users where email = who || '@test'
$$;

grant execute on all functions in schema test to anon, authenticated;

-- Acting as somebody: role + JWT claims, as the Supabase API does.
create function test.act(who text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    case when who = 'anon' then '' else json_build_object('sub', (select id from auth.users where email = who || '@test'), 'role', 'authenticated')::text end, true);
  execute format('set local role %I', case when who = 'anon' then 'anon' else 'authenticated' end);
end $$;
grant execute on function test.act(text) to anon, authenticated;

-- ── fixtures (as postgres) ──
insert into auth.users (email, raw_user_meta_data) values
  ('captain@test', '{"name":"Lena Hoffmann"}'),
  ('player@test', '{"name":"Aylin Yilmaz"}'),
  ('rival@test', '{"name":"Rival Reporter"}'),
  ('outsider@test', '{}'),
  ('admin@test', '{"name":"Staffelleitung"}');

insert into public.team_members (team_id, user_id, number, position, office, rights)
select 'spartak-au', id, 7, 'Zuspiel', 'Kapitänin', array['Ergebnisse', 'Team bearbeiten', 'Spielverlegung', 'Rechte vergeben'] from auth.users where email = 'captain@test';
insert into public.team_members (team_id, user_id, number, position)
select 'spartak-au', id, 11, 'Mitte' from auth.users where email = 'player@test';
insert into public.team_members (team_id, user_id, rights)
select 'kaboom', id, array['Ergebnisse'] from auth.users where email = 'rival@test';
insert into public.league_admins (user_id, league_id) select id, '1' from auth.users where email = 'admin@test';

-- Spartak Au (Liga 1) home games: one played yesterday, one tonight, one in two weeks, plus an away game yesterday.
create temp table g as
select
  (select id from matches where home_id = 'spartak-au' order by no limit 1 offset 0) as past,
  (select id from matches where home_id = 'spartak-au' order by no limit 1 offset 1) as today,
  (select id from matches where home_id = 'spartak-au' order by no limit 1 offset 2) as future,
  (select id from matches where away_id = 'spartak-au' order by no limit 1) as away;
grant select on g to anon, authenticated;
update matches set date = current_date - 1, sets = null where id = (select past from g);
update matches set date = current_date, time = '23:59', sets = null where id = (select today from g);
update matches set date = current_date + 14, sets = null where id = (select future from g);
update matches set date = current_date - 1, sets = null where id = (select away from g);

-- ── anonymous visitors ──
select test.act('anon');
select test.count_is('anon reads leagues', 'select * from leagues', 15);
select test.count_is('anon reads teams', 'select * from teams', 116);
select test.count_is('anon reads matches', 'select * from matches', 784);
select test.count_is('anon sees no squads', 'select * from team_members', 0);
select test.count_is('anon sees no profiles', 'select * from profiles', 0);
select test.denied('anon cannot enter a result', format($q$update matches set sets = '[[25,10],[25,10]]' where id = %L$q$, (select past from g)));
select test.denied('anon cannot start a live game', format($q$insert into live_games (match_id, reporter_id) values (%L, gen_random_uuid())$q$, (select today from g)));
reset role;

-- ── accounts ──
select test.count_is('sign-up creates a profile with the given name', $q$select * from profiles where name = 'Lena Hoffmann'$q$, 1);
select test.count_is('profile name falls back to the e-mail', $q$select * from profiles where name = 'outsider'$q$, 1);

select test.act('player');
select test.count_is('player sees own squad', 'select * from team_members', 2);
select test.count_is('player sees teammates'' profiles', 'select * from profiles', 2);
select test.denied('player cannot grant herself rights', $q$update team_members set rights = '{Ergebnisse}' where user_id = auth.uid()$q$);
select test.ok('player edits own shirt number', $q$update team_members set number = 12 where user_id = auth.uid()$q$);
select test.denied('player cannot edit the captain''s number', $q$update team_members set number = 1 where user_id <> auth.uid()$q$);
select test.denied('player cannot rename the team', $q$update teams set name = 'X' where id = 'spartak-au'$q$);
reset role;

select test.act('outsider');
select test.count_is('outsider sees no squad', 'select * from team_members', 0);
select test.count_is('outsider sees only own profile', 'select * from profiles', 1);
reset role;

-- ── results ──
select test.act('player');
select test.denied('player without "Ergebnisse" cannot enter a result', format($q$update matches set sets = '[[25,10],[25,10]]' where id = %L$q$, (select past from g)));
reset role;

select test.act('rival');
select test.denied('other team cannot enter Spartak''s home result', format($q$update matches set sets = '[[25,10],[25,10]]' where id = %L$q$, (select past from g)));
reset role;

select test.act('captain');
select test.denied('invalid sets are rejected (no two-point lead)', format($q$update matches set sets = '[[25,24],[25,10]]' where id = %L$q$, (select past from g)));
select test.denied('invalid sets are rejected (third set after 2:0)', format($q$update matches set sets = '[[25,10],[25,10],[15,3]]' where id = %L$q$, (select past from g)));
select test.denied('invalid sets are rejected (decider to 25)', format($q$update matches set sets = '[[25,10],[10,25],[25,20]]' where id = %L$q$, (select past from g)));
select test.denied('captain cannot enter an away result', format($q$update matches set sets = '[[25,10],[25,10]]' where id = %L$q$, (select away from g)));
select test.denied('captain cannot enter a result before kickoff', format($q$update matches set sets = '[[25,10],[25,10]]' where id = %L$q$, (select future from g)));
select test.denied('captain cannot move a game directly', format($q$update matches set date = date + 1 where id = %L$q$, (select future from g)));
select test.ok('captain enters the home result', format($q$update matches set sets = '[[25,21],[22,25],[15,12]]' where id = %L$q$, (select past from g)));
select test.count_is('result records who entered it', format($q$select * from matches where id = %L and result_by = auth.uid() and result_at is not null$q$, (select past from g)), 1);
select test.denied('captain cannot overwrite the result', format($q$update matches set sets = '[[25,10],[25,10]]' where id = %L$q$, (select past from g)));
reset role;

select test.act('admin');
select test.ok('Staffelleitung corrects a result', format($q$update matches set sets = '[[25,10],[25,10]]' where id = %L$q$, (select past from g)));
select test.ok('Staffelleitung moves a game', format($q$update matches set date = date + 7 where id = %L$q$, (select future from g)));
select test.denied('Staffelleitung of Liga 1 cannot touch Liga 2A', $q$update matches set date = date + 7 where league_id = '2A'$q$);
reset role;

-- ── rights ──
select test.act('captain');
select test.ok('captain grants "Ergebnisse"', $q$update team_members set rights = '{Ergebnisse}' where user_id = test.uid('player')$q$);
select test.denied('the last "Rechte vergeben" cannot be removed', $q$update team_members set rights = '{Ergebnisse}' where user_id = auth.uid()$q$);
select test.denied('captain cannot change Kaboom''s rights', $q$update team_members set rights = '{}' where team_id = 'kaboom'$q$);
select test.ok('captain edits own team''s halls', $q$update teams set venues = array['Pestalozzi-Gymnasium, Eduard-Schmid-Str. 1'] where id = 'spartak-au'$q$);
select test.denied('captain cannot edit another team', $q$update teams set venues = '{}' where id = 'kaboom'$q$);
select test.denied('captain cannot rename the team', $q$update teams set name = 'Spartak Ost' where id = 'spartak-au'$q$);
reset role;

-- ── training ──
select test.act('player');
select test.ok('player answers for herself', $q$insert into training_rsvps (team_id, session_date, answer) values ('spartak-au', current_date + 3, 'ja')$q$);
select test.ok('player changes her answer', $q$insert into training_rsvps (team_id, session_date, user_id, answer) values ('spartak-au', current_date + 3, auth.uid(), 'nein') on conflict (team_id, session_date, user_id) do update set team_id = excluded.team_id, session_date = excluded.session_date, user_id = excluded.user_id, answer = excluded.answer$q$);
select test.denied('player cannot move her answer to the captain', $q$update training_rsvps set user_id = test.uid('captain') where user_id = auth.uid()$q$);
select test.denied('player cannot move her answer to another team', $q$update training_rsvps set team_id = 'kaboom' where user_id = auth.uid()$q$);
select test.denied('player cannot answer for the captain', $q$insert into training_rsvps (team_id, session_date, user_id, answer) values ('spartak-au', current_date + 3, test.uid('captain'), 'nein')$q$);
reset role;
select test.act('outsider');
select test.denied('outsider cannot answer for Spartak', $q$insert into training_rsvps (team_id, session_date, answer) values ('spartak-au', current_date + 3, 'ja')$q$);
select test.count_is('outsider cannot read Spartak''s answers', 'select * from training_rsvps', 0);
reset role;

-- ── live games ──
select test.act('outsider');
select test.denied('outsider cannot start a live game', format($q$insert into live_games (match_id, reporter) values (%L, 'x')$q$, (select today from g)));
reset role;
select test.act('rival');
select test.denied('other team cannot start Spartak''s live game', format($q$insert into live_games (match_id, reporter) values (%L, 'x')$q$, (select today from g)));
reset role;
select test.act('captain');
select test.denied('captain cannot go live two weeks early', format($q$insert into live_games (match_id, reporter) values (%L, 'Lena')$q$, (select future from g)));
select test.denied('captain cannot report as someone else', format($q$insert into live_games (match_id, reporter, reporter_id) values (%L, 'Lena', test.uid('rival'))$q$, (select today from g)));
select test.ok('captain starts tonight''s live game', format($q$insert into live_games (match_id, reporter) values (%L, 'Lena')$q$, (select today from g)));
select test.ok('captain counts a point', format($q$update live_games set rallies = rallies || '[{"s":"home","t":1}]', updated_at = now() where match_id = %L$q$, (select today from g)));
select test.denied('captain cannot rewrite the start time', format($q$update live_games set started_at = now() - interval '1 hour' where match_id = %L$q$, (select today from g)));
reset role;
select test.act('player');
select test.ok('player who was just granted "Ergebnisse" takes over counting', format($q$update live_games set rallies = rallies || '[{"s":"away","t":2}]' where match_id = %L$q$, (select today from g)));
reset role;
select test.act('rival');
select test.denied('other team cannot change the score', format($q$update live_games set rallies = '[]' where match_id = %L$q$, (select today from g)));
select test.denied('other team cannot cancel the live game', format($q$delete from live_games where match_id = %L$q$, (select today from g)));
reset role;
select test.act('anon');
select test.count_is('anyone watches the live game', 'select * from live_games', 1);
reset role;
-- once the result is in, the live game is over and frozen
update matches set date = current_date - 1 where id = (select today from g);
select test.act('captain');
select test.ok('captain enters tonight''s result', format($q$update matches set sets = '[[25,10],[25,10]]' where id = %L$q$, (select today from g)));
select test.count_is('the result ends the live game', format($q$select * from live_games where match_id = %L and status = 'final'$q$, (select today from g)), 1);
select test.denied('live game is frozen after the result', format($q$update live_games set rallies = '[]' where match_id = %L$q$, (select today from g)));
reset role;

-- ── game moves ──
select test.act('player');
select test.denied('player without "Spielverlegung" cannot request a move', format($q$insert into move_requests (match_id, team_id, proposed_at) values (%L, 'spartak-au', now() + interval '20 days')$q$, (select future from g)));
reset role;
select test.act('captain');
select test.denied('captain cannot request a move for an away game', format($q$insert into move_requests (match_id, team_id, proposed_at) values (%L, 'kaboom', now())$q$, (select away from g)));
select test.ok('first move request', format($q$insert into move_requests (match_id, team_id, proposed_at, reason) values (%L, 'spartak-au', now() + interval '20 days', 'Halle belegt')$q$, (select future from g)));
select test.ok('second move request', format($q$insert into move_requests (match_id, team_id, proposed_at) values (%L, 'spartak-au', now() + interval '21 days')$q$, (select future from g)));
select test.denied('third move request in a season', format($q$insert into move_requests (match_id, team_id, proposed_at) values (%L, 'spartak-au', now() + interval '22 days')$q$, (select future from g)));
select test.denied('captain cannot approve her own move', $q$update move_requests set status = 'genehmigt'$q$);
reset role;
select test.act('admin');
select test.ok('Staffelleitung decides a move', $q$update move_requests set status = 'abgelehnt' where id = (select min(id) from move_requests)$q$);
reset role;

-- ── invites ──
select test.act('player');
select test.denied('player cannot create invites', $q$insert into team_invites (code, team_id) values ('abc123', 'spartak-au')$q$);
reset role;
select test.act('captain');
select test.ok('captain creates an invite', $q$insert into team_invites (code, team_id, rights) values ('spartak2026', 'spartak-au', '{Ergebnisse}')$q$);
reset role;
select test.act('outsider');
select test.denied('unknown invite code', $q$select join_team('nope')$q$);
select test.ok('outsider joins with the code', $q$select join_team(' SPARTAK2026 ')$q$);
select test.count_is('new member got the invite''s rights', $q$select * from team_members where user_id = auth.uid() and team_id = 'spartak-au' and rights = '{Ergebnisse}'$q$, 1);
select test.ok('new member leaves the team again', $q$delete from team_members where user_id = auth.uid()$q$);
reset role;
select test.act('anon');
select test.denied('anon cannot redeem invites', $q$select join_team('spartak2026')$q$);
reset role;

\echo 'All RLS tests passed.'
rollback;
