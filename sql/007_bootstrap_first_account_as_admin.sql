update public.profiles
set is_admin=true,
    account_status='approved',
    approved_at=coalesce(approved_at, now()),
    updated_at=now()
where id=(select id from auth.users order by created_at asc limit 1)
  and not exists(select 1 from public.profiles where is_admin=true);
