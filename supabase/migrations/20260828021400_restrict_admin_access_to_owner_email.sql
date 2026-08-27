create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select exists(
    select 1
    from public.profiles
    where id = (select auth.uid())
      and lower(coalesce(email, '')) = 'surfrajahmad@gmail.com'
      and is_admin = true
      and account_status = 'approved'
  );
$$;

create or replace function public.claim_initial_admin()
returns boolean
language plpgsql
security definer
set search_path to ''
as $$
begin
  if not exists(select 1 from public.profiles where is_admin = true) then
    update public.profiles
    set is_admin = true
    where id = (select auth.uid())
      and lower(coalesce(email, '')) = 'surfrajahmad@gmail.com'
      and account_status = 'approved';
    return found;
  end if;
  return false;
end;
$$;
