-- Client-side inserts for settings records should automatically bind to
-- the currently authenticated user while RLS remains the enforcement layer.
alter table public.printer_profiles
  alter column user_id set default auth.uid();

alter table public.cheque_series
  alter column user_id set default auth.uid();

-- Keep the ownership policies explicit and fail closed.
drop policy if exists printer_profiles_owner_insert on public.printer_profiles;
create policy printer_profiles_owner_insert
  on public.printer_profiles for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists cheque_series_owner_insert on public.cheque_series;
create policy cheque_series_owner_insert
  on public.cheque_series for insert to authenticated
  with check (user_id = (select auth.uid()));
