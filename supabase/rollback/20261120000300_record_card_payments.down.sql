-- Rollback for 20261120000300. Do not run once real card payments exist: it deletes the payment rows.
begin;
drop table if exists public.record_payments;
commit;
