-- Store the reusable cheque design layout used by the native designer.
alter table public.cheque_templates
  add column if not exists layout jsonb not null default '{}'::jsonb;
