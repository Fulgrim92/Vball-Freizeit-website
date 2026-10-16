-- Follow-up from Supabase's security advisor.
-- Fixed search_path on the functions that didn't set one.
alter function public.valid_sets(jsonb) set search_path = '';
alter function public.is_api_user() set search_path = '';
alter function public.kickoff(public.matches) set search_path = '';
alter function public.matches_guard() set search_path = '';

-- Trigger functions are never called directly.
revoke execute on function public.handle_new_user(), public.matches_finish_live(), public.move_requests_guard(), public.team_members_guard()
  from public, anon, authenticated;

-- The rights helpers only answer questions about the signed-in caller, and only RLS policies on
-- signed-in writes and reads use them, so visitors without an account don't need them.
revoke execute on function public.is_member(text), public.has_right(text, text), public.is_league_admin(text),
  public.shares_team(uuid), public.can_report_live(text)
  from public, anon;
