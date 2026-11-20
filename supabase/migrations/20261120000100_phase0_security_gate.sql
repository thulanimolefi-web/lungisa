-- Lungiza Phase 0 security gate, security-only release (no visible product changes)
-- STATUS: written 20 Nov 2026, NOT RUN on any database. Run on a staging copy first,
-- then run supabase/tests/negative_tests.sql, then (only with owner approval) on production.
-- Based on the read-only policy listing of 17 Nov 2026. Policy names are dropped with IF EXISTS,
-- so a renamed policy will survive: re-list pg_policies after running and compare.
-- Rollback: supabase/rollback/20261120000100_phase0_security_gate.down.sql

begin;

-- ---------------------------------------------------------------------------
-- 0. Trusted-write flag used by guard triggers.
--    Server code using the service role is trusted. SECURITY DEFINER functions that must
--    write protected columns call lungiza_trust() first (transaction-local).
-- ---------------------------------------------------------------------------
create or replace function public.lungiza_trust() returns void
language sql security definer set search_path = '' as $$
  select set_config('lungiza.trusted', 'on', true);
$$;
revoke execute on function public.lungiza_trust() from public, anon, authenticated;

create or replace function public.lungiza_is_trusted() returns boolean
language sql stable set search_path = '' as $$
  -- PostgREST runs browser requests as anon or authenticated. service_role, postgres and
  -- SECURITY DEFINER functions (current_user = owner) are trusted.
  select current_user not in ('anon', 'authenticated')
      or coalesce(current_setting('lungiza.trusted', true), '') = 'on';
$$;

-- ---------------------------------------------------------------------------
-- 1. Admin allow-list (B10) and helpers
-- ---------------------------------------------------------------------------
create table if not exists public.admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  added_at   timestamptz not null default now(),
  note       text
);
alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated;
-- OWNER STEP (manual, once): insert into public.admins(user_id, note) values ('<your auth user id>', 'founder');

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid());
$$;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Append-only audit log (B23)
-- ---------------------------------------------------------------------------
create table if not exists public.audit_events (
  id         bigint generated always as identity primary key,
  at         timestamptz not null default now(),
  actor_id   uuid,
  actor_label text,
  action     text not null,
  entity     text not null,
  entity_id  text,
  data       jsonb not null default '{}'::jsonb
);
alter table public.audit_events enable row level security;
revoke all on public.audit_events from anon, authenticated;
create or replace function public.audit_events_block_change() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'audit_events is append-only';
end $$;
drop trigger if exists audit_events_no_update on public.audit_events;
create trigger audit_events_no_update before update or delete on public.audit_events
  for each row execute function public.audit_events_block_change();
-- Note: the table owner can still TRUNCATE or disable the trigger. That is accepted and documented.

-- ---------------------------------------------------------------------------
-- 3. Remove powers anon and authenticated never need (all public tables)
-- ---------------------------------------------------------------------------
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('revoke truncate, trigger, references on public.%I from anon, authenticated', t.tablename);
    execute format('revoke insert, update, delete on public.%I from anon', t.tablename);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 4. Column-level read limits (B05, BR-0.1, BR-0.7)
--    profiles: email and phone are private. tradesperson_profiles: document paths,
--    rejection reasons and payment account ids are private.
--    Grants every other existing column, so unknown columns keep working.
-- ---------------------------------------------------------------------------
do $$
declare cols text;
begin
  revoke select on public.profiles from anon, authenticated;
  select string_agg(quote_ident(column_name), ', ') into cols
    from information_schema.columns
   where table_schema = 'public' and table_name = 'profiles'
     and column_name not in ('email', 'phone');
  execute format('grant select (%s) on public.profiles to anon, authenticated', cols);

  revoke select on public.tradesperson_profiles from anon, authenticated;
  select string_agg(quote_ident(column_name), ', ') into cols
    from information_schema.columns
   where table_schema = 'public' and table_name = 'tradesperson_profiles'
     and column_name not in ('id_document_url', 'selfie_url', 'rejection_reason', 'stripe_account_id');
  execute format('grant select (%s) on public.tradesperson_profiles to anon, authenticated', cols);
end $$;

-- Own private columns through definer functions (used by app/home, app/dashboard, VerificationBadge)
create or replace function public.my_profile() returns setof public.profiles
language sql stable security definer set search_path = '' as $$
  select * from public.profiles where id = auth.uid();
$$;
revoke execute on function public.my_profile() from public, anon;
grant execute on function public.my_profile() to authenticated;

create or replace function public.my_verification()
returns table (id_verified boolean, verification_status text, id_submitted_at timestamptz, rejection_reason text)
language sql stable security definer set search_path = '' as $$
  select tp.id_verified, tp.verification_status::text, tp.id_submitted_at, tp.rejection_reason
    from public.tradesperson_profiles tp where tp.id = auth.uid();
$$;
revoke execute on function public.my_verification() from public, anon;
grant execute on function public.my_verification() to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Guard triggers: server-only columns (B03, B04, BR-0.2, BR-0.8)
--    Triggers instead of column grants, because the app upserts whole rows on signup.
--    A change to a protected column by a browser session raises an error.
-- ---------------------------------------------------------------------------
create or replace function public.guard_profiles() returns trigger
language plpgsql set search_path = '' as $$
begin
  if public.lungiza_is_trusted() then return new; end if;
  if tg_op = 'INSERT' then
    if new.role::text not in ('homeowner', 'tradesperson') then
      raise exception 'role % cannot be self-assigned', new.role using errcode = '42501';
    end if;
    new.is_verified := false;
    return new;
  end if;
  if new.role is distinct from old.role
     or new.email is distinct from old.email
     or new.is_verified is distinct from old.is_verified
     or new.is_active is distinct from old.is_active
     or new.id is distinct from old.id then
    raise exception 'protected profile column' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists guard_profiles on public.profiles;
create trigger guard_profiles before insert or update on public.profiles
  for each row execute function public.guard_profiles();

create or replace function public.guard_tradesperson_profiles() returns trigger
language plpgsql set search_path = '' as $$
begin
  if public.lungiza_is_trusted() then return new; end if;
  if tg_op = 'INSERT' then
    new.id_verified := false;
    new.verification_status := 'unsubmitted';
    new.rating_avg := 0;
    new.rating_count := 0;
    new.jobs_completed := 0;
    new.id_document_url := null;
    new.selfie_url := null;
    new.rejection_reason := null;
    return new;  -- is_founding_member is set by the existing auto_founding_member trigger
  end if;
  if new.id_verified is distinct from old.id_verified
     or new.verification_status is distinct from old.verification_status
     or new.is_founding_member is distinct from old.is_founding_member
     or new.rating_avg is distinct from old.rating_avg
     or new.rating_count is distinct from old.rating_count
     or new.jobs_completed is distinct from old.jobs_completed
     or new.id_document_url is distinct from old.id_document_url
     or new.selfie_url is distinct from old.selfie_url
     or new.rejection_reason is distinct from old.rejection_reason
     or new.id_submitted_at is distinct from old.id_submitted_at
     or new.id is distinct from old.id then
    raise exception 'protected tradesperson column' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists guard_tradesperson_profiles on public.tradesperson_profiles;
-- name sorts after auto_founding_member, so founding is assigned first
create trigger guard_tradesperson_profiles before insert or update on public.tradesperson_profiles
  for each row execute function public.guard_tradesperson_profiles();

-- Founding status for the join page (B14). Read-only, no personal data.
create or replace function public.founding_status()
returns table (founding_count integer, founding_cap integer)
language sql stable security definer set search_path = '' as $$
  select count(*)::int, 100 from public.tradesperson_profiles where is_founding_member;
$$;
grant execute on function public.founding_status() to anon, authenticated;

-- Founding cap race (D10): serialise the founding assignment with an advisory lock.
create or replace function public.assign_founding_member() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtext('lungiza_founding'));
  new.is_founding_member := (select count(*) from public.tradesperson_profiles where is_founding_member) < 100;
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- 6. Policy fixes
-- ---------------------------------------------------------------------------
-- profiles / tradesperson_profiles: add WITH CHECK to self-update
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists tp_update_own on public.tradesperson_profiles;
drop policy if exists "Tradesperson can update own profile" on public.tradesperson_profiles;
create policy tp_update_own on public.tradesperson_profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists "Tradesperson can insert own profile" on public.tradesperson_profiles;  -- duplicate of tp_insert_own

-- payments: server only (B06)
drop policy if exists payments_insert_homeowner on public.payments;
drop policy if exists payments_update_homeowner on public.payments;
revoke insert, update, delete on public.payments from authenticated;

-- notifications: no inserts for other users (BR-0.7)
drop policy if exists notifications_insert on public.notifications;
drop policy if exists "Users update own notifications" on public.notifications;
create policy notifications_update_own on public.notifications for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists notifications_own on public.notifications;      -- duplicate SELECT
drop policy if exists notifications_select on public.notifications;   -- duplicate SELECT

-- bids: only the job owner and the bidder read bids
drop policy if exists "Anyone can read bids" on public.bids;
drop policy if exists "Authenticated users can insert bids" on public.bids;      -- duplicate, weaker
drop policy if exists "Tradespeople can update their own bids" on public.bids;   -- duplicate
drop policy if exists bids_homeowner_update on public.bids;
create policy bids_homeowner_update on public.bids for update to authenticated
  using (exists (select 1 from public.jobs j where j.id = job_id and j.homeowner_id = auth.uid()))
  with check (exists (select 1 from public.jobs j where j.id = job_id and j.homeowner_id = auth.uid()));
drop policy if exists bids_update_tradesperson on public.bids;
create policy bids_update_tradesperson on public.bids for update to authenticated
  using (tradesperson_id = auth.uid()) with check (tradesperson_id = auth.uid());

-- disputes: parties and admins only
drop policy if exists "Admin can read all disputes" on public.job_disputes;
create policy job_disputes_admin_read on public.job_disputes for select to authenticated
  using (public.is_admin());

-- completion photos: parties only
drop policy if exists "Tradesperson can insert completion photos" on public.job_completion_photos;
drop policy if exists "Job parties can view completion photos" on public.job_completion_photos;
-- Photos hang off job_completions (completion_id), as the dashboard inserts them
create policy completion_photos_insert on public.job_completion_photos for insert to authenticated
  with check (exists (select 1 from public.job_completions c
                      where c.id = job_completion_photos.completion_id and c.tradesperson_id = auth.uid()));
create policy completion_photos_read on public.job_completion_photos for select to authenticated
  using (public.is_admin()
      or exists (select 1 from public.job_completions c join public.jobs j on j.id = c.job_id
                 where c.id = job_completion_photos.completion_id
                   and (c.tradesperson_id = auth.uid() or j.homeowner_id = auth.uid())));

-- messages: inserts left exactly as they are (changing them could change who can message before a bid
-- is accepted). Only the "mark read" update gets a WITH CHECK.
drop policy if exists "Users mark own messages read" on public.messages;
create policy messages_mark_read on public.messages for update to authenticated
  using (receiver_id = auth.uid()) with check (receiver_id = auth.uid());

-- reviews: one per job, only from the job owner about the accepted tradesperson (D8)
do $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'reviews' loop
    execute format('drop policy %I on public.reviews', p.policyname);
  end loop;
end $$;
create policy reviews_read on public.reviews for select to anon, authenticated using (true);
create policy reviews_insert on public.reviews for insert to authenticated
  with check (
    reviewer_id = auth.uid()
    and exists (select 1 from public.jobs j where j.id = job_id and j.homeowner_id = auth.uid()
                and j.status in ('completed'))
    and exists (select 1 from public.bids b where b.job_id = reviews.job_id and b.tradesperson_id = reviewee_id
                and b.status = 'accepted')
  );
-- If duplicates already exist this fails: list them with
--   select job_id, reviewer_id, count(*) from public.reviews group by 1,2 having count(*) > 1;
create unique index if not exists reviews_one_per_job on public.reviews (job_id, reviewer_id);

-- One rating writer (B11): definer function, trusted write, fixed search_path
create or replace function public.recalculate_tradesperson_rating() returns trigger
language plpgsql security definer set search_path = '' as $$
declare target uuid := coalesce(new.reviewee_id, old.reviewee_id);
begin
  perform public.lungiza_trust();
  update public.tradesperson_profiles tp set
    rating_avg   = coalesce((select round(avg(r.rating)::numeric, 1) from public.reviews r where r.reviewee_id = target), 0),
    rating_count = (select count(*) from public.reviews r where r.reviewee_id = target),
    -- never lowers today's number; counts completed jobs this tradesperson won
    jobs_completed = greatest(tp.jobs_completed, (select count(*) from public.jobs j
                       where j.status = 'completed'
                         and exists (select 1 from public.bids b where b.job_id = j.id and b.tradesperson_id = target
                                     and b.status = 'accepted')))
  where tp.id = target;
  return null;
end $$;
drop trigger if exists review_inserted on public.reviews;      -- duplicate writer (refresh_tradesperson_rating)
drop trigger if exists on_review_change on public.reviews;
create trigger on_review_change after insert or update or delete on public.reviews
  for each row execute function public.recalculate_tradesperson_rating();
drop function if exists public.refresh_tradesperson_rating();

-- bids: duplicate counter trigger (keep the count-based one)
drop trigger if exists bid_inserted on public.bids;
drop function if exists public.notify_homeowner_on_bid();

-- ---------------------------------------------------------------------------
-- 7. Views run with the caller's rights (NFR-2)
-- ---------------------------------------------------------------------------
alter view if exists public.v_tradesperson_public set (security_invoker = true);
alter view if exists public.v_jobs_feed set (security_invoker = true);

-- ---------------------------------------------------------------------------
-- 8. Fixed search_path on every app function in public (NFR-2)
-- ---------------------------------------------------------------------------
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')  -- skip extension functions
       and (p.proconfig is null or not exists (select 1 from unnest(p.proconfig) c where c like 'search_path=%'))
  loop
    execute format('alter function %s set search_path = public, pg_temp', f.sig);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 9. Storage: private bucket for ID documents and selfies (B02)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('verification-docs', 'verification-docs', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'])
on conflict (id) do update set public = false;

drop policy if exists verification_docs_insert_own on storage.objects;
create policy verification_docs_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'verification-docs'
              and (storage.foldername(name))[1] = 'id-docs'
              and (storage.foldername(name))[2] = auth.uid()::text);
drop policy if exists verification_docs_update_own on storage.objects;
create policy verification_docs_update_own on storage.objects for update to authenticated
  using (bucket_id = 'verification-docs' and (storage.foldername(name))[2] = auth.uid()::text)
  with check (bucket_id = 'verification-docs' and (storage.foldername(name))[2] = auth.uid()::text);
drop policy if exists verification_docs_select_own on storage.objects;
create policy verification_docs_select_own on storage.objects for select to authenticated
  using (bucket_id = 'verification-docs' and (storage.foldername(name))[2] = auth.uid()::text);
-- Admin reads go through /api/admin/verification-doc (service role, 5-minute signed URLs).

-- Stop new uploads into job-photos/id-docs. Existing objects are handled by the manual script
-- supabase/manual/move_legacy_id_docs.md after the owner's count-only check.
drop policy if exists "Authenticated users can upload" on storage.objects;
create policy job_photos_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'job-photos' and (storage.foldername(name))[1] <> 'id-docs');

commit;
