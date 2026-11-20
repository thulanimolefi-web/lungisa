-- Rollback for 20261120000100_phase0_security_gate.sql
-- Restores the grants and policies as listed on 17 Nov 2026 (the insecure state), so only use it
-- to recover from a broken release, then fix forward. Run the app rollback (previous Vercel
-- deployment) at the same time, because the new app code expects the new functions.
-- Not able to restore: dropped duplicate trigger functions' exact bodies (refresh_tradesperson_rating,
-- notify_homeowner_on_bid): take them from the pre-migration schema dump the owner makes first.

begin;

-- grants
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('grant all on public.%I to anon, authenticated', t.tablename);
  end loop;
end $$;
grant select on public.profiles, public.tradesperson_profiles to anon, authenticated;

-- guard triggers and helpers
drop trigger if exists guard_profiles on public.profiles;
drop trigger if exists guard_tradesperson_profiles on public.tradesperson_profiles;
drop function if exists public.guard_profiles();
drop function if exists public.guard_tradesperson_profiles();

-- policies back to the 17 Nov listing
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update using (auth.uid() = id);
drop policy if exists tp_update_own on public.tradesperson_profiles;
create policy tp_update_own on public.tradesperson_profiles for update using (auth.uid() = id);
create policy "Tradesperson can update own profile" on public.tradesperson_profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "Tradesperson can insert own profile" on public.tradesperson_profiles for insert to authenticated with check (auth.uid() = id);
create policy payments_insert_homeowner on public.payments for insert with check (auth.uid() = homeowner_id);
create policy payments_update_homeowner on public.payments for update using (auth.uid() = homeowner_id);
create policy notifications_insert on public.notifications for insert to authenticated with check (true);
drop policy if exists notifications_update_own on public.notifications;
create policy "Users update own notifications" on public.notifications for update using (auth.uid() = user_id);
create policy notifications_own on public.notifications for select using (auth.uid() = user_id);
create policy "Anyone can read bids" on public.bids for select to authenticated using (true);
create policy "Authenticated users can insert bids" on public.bids for insert to authenticated with check (auth.uid() = tradesperson_id);
create policy "Tradespeople can update their own bids" on public.bids for update to authenticated using (auth.uid() = tradesperson_id);
drop policy if exists bids_homeowner_update on public.bids;
create policy bids_homeowner_update on public.bids for update using (exists (select 1 from public.jobs j where j.id = job_id and j.homeowner_id = auth.uid()));
drop policy if exists bids_update_tradesperson on public.bids;
create policy bids_update_tradesperson on public.bids for update using (tradesperson_id = auth.uid());
drop policy if exists job_disputes_admin_read on public.job_disputes;
create policy "Admin can read all disputes" on public.job_disputes for select to authenticated using (true);
drop policy if exists completion_photos_insert on public.job_completion_photos;
drop policy if exists completion_photos_read on public.job_completion_photos;
create policy "Tradesperson can insert completion photos" on public.job_completion_photos for insert to authenticated with check (true);
create policy "Job parties can view completion photos" on public.job_completion_photos for select using (true);
drop policy if exists messages_mark_read on public.messages;
create policy "Users mark own messages read" on public.messages for update using (receiver_id = auth.uid());
drop policy if exists reviews_insert on public.reviews;
create policy "Reviews insert (restored)" on public.reviews for insert to authenticated with check (auth.uid() = reviewer_id);
drop index if exists public.reviews_one_per_job;

-- views back to owner rights
alter view if exists public.v_tradesperson_public reset (security_invoker);
alter view if exists public.v_jobs_feed reset (security_invoker);

-- storage
drop policy if exists verification_docs_insert_own on storage.objects;
drop policy if exists verification_docs_update_own on storage.objects;
drop policy if exists verification_docs_select_own on storage.objects;
drop policy if exists job_photos_upload on storage.objects;
create policy "Authenticated users can upload" on storage.objects for insert to authenticated with check (bucket_id = 'job-photos');
-- The verification-docs bucket and its objects are kept on purpose (never delete ID files in a rollback).

-- kept on purpose: admins, audit_events, my_profile, my_verification, founding_status, is_admin,
-- the single rating trigger and the fixed search_path settings. They are harmless to the old app.

commit;
