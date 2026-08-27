-- Production security cleanup for the account approval workflow.
-- Trigger functions do not need to be callable through the public PostgREST RPC surface.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Keep one owner SELECT policy on profiles to avoid duplicate permissive policy evaluation.
drop policy if exists profiles_owner_select on public.profiles;
