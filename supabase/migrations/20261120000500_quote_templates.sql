-- Tradespeople's own saved quote templates. Additive, deny-by-default (server API only).
-- Rollback: supabase/rollback/20261120000500_quote_templates.down.sql
begin;

create table public.quote_templates (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  name        text not null check (length(name) between 1 and 120),
  trade_pack  text,
  lines       jsonb not null default '[]'::jsonb,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index quote_templates_owner_idx on public.quote_templates (owner_id, trade_pack);
create trigger quote_templates_touch before update on public.quote_templates
  for each row execute function public.touch_updated_at();

alter table public.quote_templates enable row level security;
revoke all on public.quote_templates from anon, authenticated;

commit;
