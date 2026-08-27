-- Manual cheque numbers are entered by the user and uniquely identify a cheque in their register.
create unique index if not exists cheques_user_cheque_number_unique
on public.cheques(user_id, cheque_number)
where cheque_number is not null and cheque_number > 0;

create or replace function public.create_and_print_cheque(
  p_cheque_number bigint,
  p_payee_id uuid,
  p_cheque_date date,
  p_amount numeric,
  p_amount_in_words text,
  p_layout_snapshot jsonb,
  p_notes text default '',
  p_draft_id uuid default null
)
returns public.cheques
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_cheque public.cheques;
begin
  if p_cheque_number is null or p_cheque_number <= 0 then
    raise exception 'Cheque number must be a positive whole number';
  end if;

  if p_draft_id is not null then
    select * into v_cheque from public.cheques
    where id=p_draft_id and user_id=auth.uid() and status='draft' for update;
    if not found then raise exception 'Draft not found or access denied'; end if;
  end if;

  if exists (select 1 from public.cheques where user_id=auth.uid() and cheque_number=p_cheque_number and id<>coalesce(p_draft_id,'00000000-0000-0000-0000-000000000000'::uuid)) then
    raise exception 'Cheque number % already exists in your register', p_cheque_number;
  end if;

  if p_draft_id is not null then
    update public.cheques set cheque_number=p_cheque_number,payee_id=p_payee_id,cheque_date=p_cheque_date,amount=p_amount,amount_in_words=p_amount_in_words,status='printed',layout_snapshot=p_layout_snapshot,notes=coalesce(p_notes,''),print_count=1,first_printed_at=now(),last_printed_at=now(),updated_at=now()
    where id=v_cheque.id returning * into v_cheque;
  else
    insert into public.cheques(user_id,cheque_series_id,cheque_number,payee_id,cheque_date,amount,amount_in_words,status,layout_snapshot,notes,print_count,first_printed_at,last_printed_at)
    values(auth.uid(),null,p_cheque_number,p_payee_id,p_cheque_date,p_amount,p_amount_in_words,'printed',p_layout_snapshot,coalesce(p_notes,''),1,now(),now()) returning * into v_cheque;
  end if;

  insert into public.print_history(cheque_id,user_id,print_number,printed_at,layout_snapshot,notes)
  values(v_cheque.id,auth.uid(),1,now(),p_layout_snapshot,coalesce(p_notes,''));
  return v_cheque;
end;
$$;

grant execute on function public.create_and_print_cheque(bigint,uuid,date,numeric,text,jsonb,text,uuid) to authenticated;
