create index if not exists rate_limits_window_started_idx
  on public.rate_limits (window_started_at);
create index if not exists guest_rate_limits_window_started_idx
  on public.guest_rate_limits (window_started_at);
create index if not exists idempotency_keys_created_at_idx
  on public.idempotency_keys (created_at);

create or replace function public.cleanup_expired_request_data(p_limit integer default 1000)
returns integer
language plpgsql security definer set search_path = public as $$
declare
  deleted_total integer := 0;
  deleted_count integer;
  batch_limit integer := least(greatest(coalesce(p_limit, 1000), 1), 10000);
begin
  with expired as (
    select ctid from rate_limits
    where window_started_at < now() - interval '48 hours'
    order by window_started_at
    limit batch_limit
  )
  delete from rate_limits target using expired
  where target.ctid = expired.ctid;
  get diagnostics deleted_count = row_count;
  deleted_total := deleted_total + deleted_count;

  with expired as (
    select ctid from guest_rate_limits
    where window_started_at < now() - interval '48 hours'
    order by window_started_at
    limit batch_limit
  )
  delete from guest_rate_limits target using expired
  where target.ctid = expired.ctid;
  get diagnostics deleted_count = row_count;
  deleted_total := deleted_total + deleted_count;

  with expired as (
    select ctid from idempotency_keys
    where created_at < now() - interval '24 hours'
    order by created_at
    limit batch_limit
  )
  delete from idempotency_keys target using expired
  where target.ctid = expired.ctid;
  get diagnostics deleted_count = row_count;
  deleted_total := deleted_total + deleted_count;

  return deleted_total;
end;
$$;

revoke all on function public.cleanup_expired_request_data(integer) from public, anon, authenticated;
grant execute on function public.cleanup_expired_request_data(integer) to service_role;
