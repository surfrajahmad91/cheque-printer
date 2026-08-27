alter table public.profiles add column if not exists email text, add column if not exists account_status text not null default 'pending', add column if not exists approved_at timestamptz, add column if not exists rejected_at timestamptz, add column if not exists review_note text, add column if not exists is_admin boolean not null default false;

alter table public.profiles drop constraint if exists profiles_account_status_check;
alter table public.profiles add constraint profiles_account_status_check check (account_status in ('pending','approved','rejected'));

update public.profiles p
set email = u.email,
    account_status = 'approved',
    approved_at = coalesce(p.approved_at, p.created_at)
from auth.users u
where u.id = p.id and (p.email is distinct from u.email or p.account_status = 'pending');

create index if not exists profiles_account_status_idx on public.profiles(account_status, created_at desc);
create index if not exists profiles_admin_idx on public.profiles(is_admin) where is_admin = true;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, full_name, email, account_status)
  values(new.id, new.raw_user_meta_data->>'name', new.email, 'pending')
  on conflict(id) do update set email=excluded.email;
  return new;
end;
$$;

drop policy if exists "profiles own" on public.profiles;
revoke insert, update, delete on public.profiles from authenticated;
grant select on public.profiles to authenticated;
create policy "profiles own select" on public.profiles for select to authenticated using ((select auth.uid())=id);

create schema if not exists private;

create or replace function private.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles where id=(select auth.uid()) and is_admin=true and account_status='approved');
$$;
revoke execute on function private.is_admin() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;

create or replace function public.admin_list_accounts()
returns table(id uuid, full_name text, email text, account_status text, created_at timestamptz, approved_at timestamptz, rejected_at timestamptz, review_note text)
language sql stable security definer set search_path = '' as $$
  select p.id,p.full_name,p.email,p.account_status,p.created_at,p.approved_at,p.rejected_at,p.review_note
  from public.profiles p
  where private.is_admin()
  order by case p.account_status when 'pending' then 0 when 'rejected' then 1 else 2 end, p.created_at desc;
$$;

create or replace function public.admin_approve_account(target_user_id uuid, note text default null)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_admin() then raise exception 'Not authorized'; end if;
  update public.profiles set account_status='approved', approved_at=now(), rejected_at=null, review_note=note, updated_at=now() where id=target_user_id;
  return found;
end;
$$;

create or replace function public.admin_reject_account(target_user_id uuid, note text default null)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_admin() then raise exception 'Not authorized'; end if;
  update public.profiles set account_status='rejected', rejected_at=now(), approved_at=null, review_note=note, updated_at=now() where id=target_user_id;
  return found;
end;
$$;

create or replace function public.claim_initial_admin()
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if not exists(select 1 from public.profiles where is_admin=true) then
    update public.profiles set is_admin=true where id=(select auth.uid()) and account_status='approved';
    return found;
  end if;
  return false;
end;
$$;

revoke execute on function public.admin_list_accounts() from public, anon;
revoke execute on function public.admin_approve_account(uuid,text) from public, anon;
revoke execute on function public.admin_reject_account(uuid,text) from public, anon;
revoke execute on function public.claim_initial_admin() from public, anon;
grant execute on function public.admin_list_accounts() to authenticated;
grant execute on function public.admin_approve_account(uuid,text) to authenticated;
grant execute on function public.admin_reject_account(uuid,text) to authenticated;
grant execute on function public.claim_initial_admin() to authenticated;
