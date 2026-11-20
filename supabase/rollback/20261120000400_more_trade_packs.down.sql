-- Rollback for 20261120000400. Fails if any record already uses a new pack: change those rows first.
begin;
alter table public.job_records drop constraint if exists job_records_trade_pack_check;
alter table public.job_records add constraint job_records_trade_pack_check check (trade_pack in ('geyser', 'electrical'));
commit;
