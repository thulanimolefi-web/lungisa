-- Lungiza Day-1 MVP: shared, property-linked job record (BRD revision 2)
-- STATUS: written 20 Nov 2026, NOT RUN on any database. Requires 20261120000100 first.
-- Design: every table here is deny-by-default for anon and authenticated (RLS on, no policies,
-- no grants). All reads and writes go through server API routes that check the caller
-- (app/lib/jobrecord-server.ts). This keeps link-based access (no account) and account access
-- in one place, and keeps POPIA-relevant data off the browser key.
-- Rollback: supabase/rollback/20261120000200_mvp_job_record.down.sql

begin;

-- Organisations: a private landlord is an organisation of one; an agency has members (B35/B40)
create table public.organisations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  kind        text not null check (kind in ('landlord', 'agency')),
  created_by  uuid not null references auth.users(id),
  created_at  timestamptz not null default now()
);
create table public.memberships (
  org_id      uuid not null references public.organisations(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null default 'manager' check (role in ('principal', 'manager')),
  created_at  timestamptz not null default now(),
  primary key (org_id, user_id)
);

-- Properties: jobs attach to a property, not only a user (BR-4.1)
create table public.properties (
  id            uuid primary key default gen_random_uuid(),
  address_line  text not null,
  unit          text,
  suburb        text,
  city          text default 'Johannesburg',
  erf           text,
  org_id        uuid references public.organisations(id) on delete set null,
  created_by    uuid references auth.users(id),
  created_at    timestamptz not null default now()
);
create index properties_addr_idx on public.properties (lower(address_line), coalesce(lower(unit), ''));

-- Access grants after a claim (BR-4.2): owner, manager or viewer
create table public.property_grants (
  property_id  uuid not null references public.properties(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  grant_role   text not null check (grant_role in ('owner', 'viewer')),
  consent_text text not null,
  created_at   timestamptz not null default now(),
  revoked_at   timestamptz,
  primary key (property_id, user_id)
);

-- Mandate per managed property: approval cap, emergency cap (default zero), backup contact (R3, R5)
create table public.mandates (
  property_id          uuid primary key references public.properties(id) on delete cascade,
  org_id               uuid not null references public.organisations(id) on delete cascade,
  owner_name           text not null,
  owner_phone          text,
  owner_email          text,
  approval_cap_cents   integer not null default 0 check (approval_cap_cents >= 0),
  emergency_cap_cents  integer not null default 0 check (emergency_cap_cents >= 0),
  require_receiver_confirmed_above_cap boolean not null default true,
  backup_name          text,
  backup_phone         text,
  backup_email         text,
  updated_at           timestamptz not null default now()
);

-- The job record (B17/B18). Marketplace jobs link to it through marketplace_job_id.
create table public.job_records (
  id                  uuid primary key default gen_random_uuid(),
  ref                 text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  source              text not null check (source in ('own', 'marketplace', 'agent', 'listing')),
  marketplace_job_id  uuid unique references public.jobs(id) on delete set null,
  property_id         uuid not null references public.properties(id),
  org_id              uuid references public.organisations(id) on delete set null,
  tradesperson_id     uuid references auth.users(id),
  created_by          uuid not null references auth.users(id),
  customer_name       text,
  customer_phone      text,
  customer_email      text,
  title               text not null,
  scope               text,
  trade_pack          text check (trade_pack in ('geyser', 'electrical')),
  pack_fields         jsonb not null default '{}'::jsonb,
  urgency             text not null default 'routine' check (urgency in ('urgent', 'routine')),
  status              text not null default 'draft' check (status in
                        ('draft', 'quoted', 'awaiting_approval', 'approved', 'in_progress',
                         'awaiting_signoff', 'completed', 'disputed', 'closed_without_signoff',
                         'cancelled', 'unassigned')),
  commission_flag     boolean not null default false,  -- 8% applies only to marketplace jobs
  invoice_status      text not null default 'none' check (invoice_status in
                        ('none', 'sent', 'paid', 'part_paid', 'overdue')),
  invoice_amount_cents integer,
  payment_details     text,      -- the trade's own EFT details or payment link; Lungiza never receives money
  amount_disputed     boolean not null default false,
  receiver_marked_paid_at timestamptz,
  work_done_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  closed_at           timestamptz
);
create index job_records_trade_idx on public.job_records (tradesperson_id, status);
create index job_records_property_idx on public.job_records (property_id);
create index job_records_org_idx on public.job_records (org_id, status);

-- Quote versions, frozen once sent (BR-1.6, R6)
create table public.record_quotes (
  id               uuid primary key default gen_random_uuid(),
  record_id        uuid not null references public.job_records(id) on delete cascade,
  version          integer not null,
  call_out_cents   integer not null default 0 check (call_out_cents >= 0),
  labour_cents     integer not null default 0 check (labour_cents >= 0),
  materials_cents  integer not null default 0 check (materials_cents >= 0),
  lines            jsonb not null default '[]'::jsonb,
  notes            text,
  sent_at          timestamptz,
  superseded_at    timestamptz,
  created_by       uuid not null references auth.users(id),
  created_at       timestamptz not null default now(),
  unique (record_id, version)
);
create or replace function public.record_quotes_freeze() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.sent_at is not null and (
       new.call_out_cents is distinct from old.call_out_cents or new.labour_cents is distinct from old.labour_cents
    or new.materials_cents is distinct from old.materials_cents or new.lines is distinct from old.lines
    or new.version is distinct from old.version or new.record_id is distinct from old.record_id) then
    raise exception 'a sent quote is frozen; create a new version';
  end if;
  return new;
end $$;
create trigger record_quotes_freeze before update on public.record_quotes
  for each row execute function public.record_quotes_freeze();

-- Extras (variations): approval needed before the extra work (R2), emergency within cap only (R3)
create table public.variations (
  id               uuid primary key default gen_random_uuid(),
  record_id        uuid not null references public.job_records(id) on delete cascade,
  description      text not null,
  amount_cents     integer not null check (amount_cents >= 0),
  is_emergency     boolean not null default false,
  emergency_reason text,
  status           text not null default 'requested' check (status in
                     ('requested', 'approved', 'declined', 'emergency_within_cap', 'disputed_extra')),
  created_by       uuid not null references auth.users(id),
  created_at       timestamptz not null default now()
);

-- Approvals: every yes or no is a row; the label says who confirmed it (R4)
create table public.approvals (
  id              uuid primary key default gen_random_uuid(),
  record_id       uuid not null references public.job_records(id) on delete cascade,
  subject         text not null check (subject in ('quote', 'variation', 'completion', 'payment')),
  subject_id      uuid,
  quote_version   integer,
  decision        text not null check (decision in
                    ('approved', 'declined', 'signed_off', 'problem_reported', 'marked_paid', 'amount_disputed', 'trade_no_show')),
  approval_type   text not null check (approval_type in ('receiver_confirmed', 'creator_recorded', 'under_mandate')),
  approver_name   text,
  approver_phone  text,
  approver_email  text,
  otp_verified_at timestamptz,
  authority_basis text,
  note            text,
  void_at         timestamptz,       -- set when a new quote version replaces the one approved (R6)
  created_by      uuid references auth.users(id),
  created_at      timestamptz not null default now()
);
create index approvals_record_idx on public.approvals (record_id, subject);

-- Share links (B20/B39): token is never stored, only its SHA-256 hash
create table public.share_links (
  id              uuid primary key default gen_random_uuid(),
  token_hash      text not null unique,
  scope           text not null check (scope in ('approver', 'viewer', 'tenant', 'handover')),
  record_id       uuid references public.job_records(id) on delete cascade,
  property_id     uuid references public.properties(id) on delete cascade,
  listing_id      uuid,
  recipient_name  text,
  recipient_phone text,
  recipient_email text,
  expires_at      timestamptz,
  revoked_at      timestamptz,
  created_by      uuid not null references auth.users(id),
  created_at      timestamptz not null default now(),
  check (record_id is not null or property_id is not null or listing_id is not null)
);

-- One-time codes for receiver confirmation (BR-2.1)
create table public.otp_challenges (
  id            uuid primary key default gen_random_uuid(),
  link_id       uuid not null references public.share_links(id) on delete cascade,
  channel       text not null check (channel in ('email', 'sms')),
  destination   text not null,
  code_hash     text not null,
  attempts      integer not null default 0,
  expires_at    timestamptz not null,
  verified_at   timestamptz,
  session_hash  text,
  created_at    timestamptz not null default now()
);

create table public.record_photos (
  id          uuid primary key default gen_random_uuid(),
  record_id   uuid not null references public.job_records(id) on delete cascade,
  kind        text not null check (kind in ('before', 'after', 'variation', 'problem', 'pack')),
  pack_item   text,
  path        text not null,
  created_by  uuid,
  created_at  timestamptz not null default now()
);

-- Certificates (B25): stored and checked, never generated (BR-3.3)
create table public.certificates (
  id              uuid primary key default gen_random_uuid(),
  property_id     uuid not null references public.properties(id) on delete cascade,
  record_id       uuid references public.job_records(id) on delete set null,
  cert_type       text not null check (cert_type in ('ecoc', 'pirb_coc', 'gas_coc', 'fence', 'other')),
  number          text,
  issue_date      date,
  issuer_name     text,
  issuer_reg_no   text,
  scope_note      text,
  file_path       text,
  issuer_checked_at timestamptz,   -- admin manual check (BR-3.4); until then "self-declared"
  created_by      uuid references auth.users(id),
  created_at      timestamptz not null default now()
);
create index certificates_property_idx on public.certificates (property_id, cert_type);

-- Private trade notes (BR-1.5): never joined into any shared view
create table public.trade_notes (
  id          uuid primary key default gen_random_uuid(),
  record_id   uuid not null references public.job_records(id) on delete cascade,
  author_id   uuid not null references auth.users(id),
  body        text not null,
  created_at  timestamptz not null default now()
);

-- Tenant reports through a unit link (BR-5.3)
create table public.tenant_reports (
  id              uuid primary key default gen_random_uuid(),
  property_id     uuid not null references public.properties(id) on delete cascade,
  link_id         uuid references public.share_links(id) on delete set null,
  description     text not null,
  urgency         text not null default 'routine' check (urgency in ('urgent', 'routine')),
  reporter_name   text,
  reporter_phone  text,
  record_id       uuid references public.job_records(id) on delete set null,
  created_at      timestamptz not null default now()
);

-- Sales listings and transfer checklist (B37/B42)
create table public.listings (
  id          uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  agent_id    uuid not null references auth.users(id),
  seller_name text,
  seller_phone text,
  seller_email text,
  status      text not null default 'open' check (status in ('open', 'transferred', 'withdrawn')),
  created_at  timestamptz not null default now()
);
create table public.listing_items (
  id             uuid primary key default gen_random_uuid(),
  listing_id     uuid not null references public.listings(id) on delete cascade,
  item           text not null check (item in ('ecoc', 'gas_coc', 'fence', 'solar_in_ecoc', 'other')),
  required       boolean not null default true,
  applies        boolean,                   -- null = not yet answered (for gas, fence, solar)
  certificate_id uuid references public.certificates(id) on delete set null,
  record_id      uuid references public.job_records(id) on delete set null,
  unique (listing_id, item)
);
alter table public.share_links add constraint share_links_listing_fk
  foreign key (listing_id) references public.listings(id) on delete cascade;

-- updated_at
create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$ begin new.updated_at := now(); return new; end $$;
create trigger job_records_touch before update on public.job_records
  for each row execute function public.touch_updated_at();
create trigger mandates_touch before update on public.mandates
  for each row execute function public.touch_updated_at();

-- Deny by default
do $$
declare t text;
begin
  foreach t in array array['organisations','memberships','properties','property_grants','mandates','job_records',
    'record_quotes','variations','approvals','share_links','otp_challenges','record_photos','certificates',
    'trade_notes','tenant_reports','listings','listing_items'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;

-- Private bucket for job evidence and certificates (NFR-3). Uploads use server-issued signed upload URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('job-records', 'job-records', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'])
on conflict (id) do update set public = false;

commit;
