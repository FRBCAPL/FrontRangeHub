-- Shared-project cron / index hygiene (all hub apps use one Supabase project).
--
-- APPLY in Supabase SQL editor when ready. Safe to re-run.
--
-- 1) Drop ItemSure duplicate membership index (same definition as organization_memberships_user_idx).
-- 2) Reschedule consignment-close-auctions from every minute to every 5 minutes
--    (reduces cron.job_run_details write churn; auctions still close on view/bid).
-- 3) Prune old pg_cron run history (default keep 14 days) on a daily schedule.
--
-- Check after apply:
--   SELECT indexname FROM pg_indexes WHERE indexname = 'organizations_demo_member_idx';  -- 0 rows
--   SELECT jobname, schedule FROM cron.job WHERE jobname IN ('consignment-close-auctions', 'prune-cron-job-run-details');
--   SELECT public.prune_cron_job_run_details(14);  -- optional one-shot prune now

-- ── 1. Duplicate index ───────────────────────────────────────────────────────

drop index if exists itemsure.organizations_demo_member_idx;

-- ── 2. Auction closer: every 5 minutes ───────────────────────────────────────

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'consignment-close-auctions';
    perform cron.schedule(
      'consignment-close-auctions',
      '*/5 * * * *',
      'select public.close_due_consignment_auctions()'
    );
  else
    raise warning 'pg_cron is not enabled: skipped consignment-close-auctions reschedule.';
  end if;
end $$;

-- ── 3. cron.job_run_details retention ────────────────────────────────────────
-- pg_cron appends a row for every job run. On a busy shared project that table
-- grows steadily (writes showed up strongly in pg_stat_statements). Keeping a
-- short operational window is enough for debugging; export first if you need
-- longer history.

create or replace function public.prune_cron_job_run_details(p_keep_days integer default 14)
returns integer
language plpgsql
security definer
set search_path = public, cron
as $$
declare
  deleted integer := 0;
  keep integer := greatest(coalesce(p_keep_days, 14), 1);
begin
  if keep > 365 then
    raise exception 'Keep at most 365 days of cron run history (got %).', keep;
  end if;

  delete from cron.job_run_details
  where coalesce(end_time, start_time) < (now() - make_interval(days => keep));

  get diagnostics deleted = row_count;
  return deleted;
end;
$$;

comment on function public.prune_cron_job_run_details(integer) is
  'Deletes pg_cron job_run_details older than p_keep_days (default 14). Shared hub hygiene; permanently removes run history.';

revoke all on function public.prune_cron_job_run_details(integer) from public, anon, authenticated;
grant execute on function public.prune_cron_job_run_details(integer) to postgres, service_role;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'prune-cron-job-run-details';
    -- Daily ~06:25 UTC — after typical overnight jobs; adjust if you prefer local morning.
    perform cron.schedule(
      'prune-cron-job-run-details',
      '25 6 * * *',
      'select public.prune_cron_job_run_details(14)'
    );
  else
    raise warning 'pg_cron is not enabled: skipped prune-cron-job-run-details schedule.';
  end if;
end $$;
