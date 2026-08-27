insert into public.profiles(id, full_name, email, account_status, approved_at)
select u.id, u.raw_user_meta_data->>'name', u.email, 'approved', now()
from auth.users u
where not exists (select 1 from public.profiles p where p.id=u.id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, full_name, email, account_status)
  values(new.id, new.raw_user_meta_data->>'name', new.email, 'pending')
  on conflict(id) do update set email=excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
