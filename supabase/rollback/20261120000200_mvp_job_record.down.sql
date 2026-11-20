-- Rollback for 20261120000200_mvp_job_record.sql
-- WARNING: drops every job record, approval, certificate row and link. Only use before real data exists.
-- With real data, do not run this: turn the screens off instead (remove the nav links) and keep the data.
begin;
drop table if exists public.listing_items, public.tenant_reports, public.trade_notes, public.certificates,
  public.record_photos, public.otp_challenges, public.share_links, public.approvals, public.variations,
  public.record_quotes, public.job_records, public.mandates, public.property_grants, public.listings,
  public.properties, public.memberships, public.organisations cascade;
drop function if exists public.record_quotes_freeze();
drop function if exists public.touch_updated_at();
-- Storage bucket job-records is left in place; empty it from the dashboard if needed.
commit;
