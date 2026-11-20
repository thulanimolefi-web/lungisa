-- Lungiza job records: card payments through Yoco on the customer's link.
-- Requires 20261120000200. Additive only: one new table, deny-by-default.
-- The server creates a Yoco checkout for the amount still due on a record; the signed Yoco
-- webhook marks the row paid. Payout to the tradesperson stays manual (admin, by EFT) and is
-- due only after the customer signs off.
-- Rollback: supabase/rollback/20261120000300_record_card_payments.down.sql

begin;

create table public.record_payments (
  id                uuid primary key default gen_random_uuid(),
  record_id         uuid not null references public.job_records(id) on delete restrict,
  link_id           uuid references public.share_links(id) on delete set null,
  amount_cents      integer not null check (amount_cents > 0),
  commission_cents  integer not null default 0 check (commission_cents >= 0),
  net_cents         integer not null check (net_cents >= 0),
  currency          text not null default 'ZAR',
  yoco_checkout_id  text unique,
  status            text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'review')),
  payer_email       text,
  paid_at           timestamptz,
  payout_status     text not null default 'not_due' check (payout_status in ('not_due', 'pending', 'paid')),
  payout_reference  text,
  payout_at         timestamptz,
  created_at        timestamptz not null default now()
);
create index record_payments_record_idx on public.record_payments (record_id, status);
create index record_payments_payout_idx on public.record_payments (payout_status, status);

alter table public.record_payments enable row level security;
revoke all on public.record_payments from anon, authenticated;

commit;
