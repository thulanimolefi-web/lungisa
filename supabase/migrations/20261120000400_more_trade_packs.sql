-- More trade packs on job records. Widens the allowed values only; existing rows are unaffected.
begin;
alter table public.job_records drop constraint if exists job_records_trade_pack_check;
alter table public.job_records add constraint job_records_trade_pack_check check (trade_pack in (
  'plumbing', 'geyser', 'electrical', 'solar', 'gas', 'roofing', 'waterproofing',
  'painting', 'tiling', 'carpentry', 'welding', 'garden', 'cleaning', 'general'));
commit;
