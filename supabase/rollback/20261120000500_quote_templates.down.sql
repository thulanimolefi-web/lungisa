-- Rollback for 20261120000500. Deletes tradespeople's saved templates.
begin;
drop table if exists public.quote_templates;
commit;
