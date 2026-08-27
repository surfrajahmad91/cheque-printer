-- Atomic, audit-friendly reprint operation.
-- Run after sql/001_schema.sql in Supabase SQL Editor.
create or replace function public.record_cheque_print(p_cheque_id uuid, p_notes text default '')
returns public.cheques
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_cheque public.cheques;
  v_next integer;
begin
  select * into v_cheque
  from public.cheques
  where id = p_cheque_id and user_id = (select auth.uid())
  for update;

  if not found then
    raise exception 'Cheque not found or access denied';
  end if;

  if v_cheque.status in ('cancelled','void') then
    raise exception 'A cancelled or void cheque cannot be printed';
  end if;

  v_next := coalesce(v_cheque.print_count, 0) + 1;

  update public.cheques
  set status = case when v_next = 1 then 'printed' else 'reprinted' end,
      print_count = v_next,
      first_printed_at = coalesce(first_printed_at, now()),
      last_printed_at = now(),
      updated_at = now()
  where id = p_cheque_id
  returning * into v_cheque;

  insert into public.print_history(
    cheque_id, user_id, print_number, printed_at, layout_snapshot, notes
  ) values (
    v_cheque.id,
    (select auth.uid()),
    v_next,
    now(),
    v_cheque.layout_snapshot,
    coalesce(p_notes, '')
  );

  return v_cheque;
end;
$$;

grant execute on function public.record_cheque_print(uuid, text) to authenticated;
