create or replace function public.claim_due_rsvp_notifications(p_limit integer default 20)
returns setof public.rsvps
language plpgsql security definer set search_path = public as $$
begin
  return query
  with due as (
    select id from rsvps
    where notification_status = 'pending'
      and (next_attempt_at is null or next_attempt_at <= now())
      and (notification_claimed_at is null or notification_claimed_at < now() - interval '2 minutes')
    order by coalesce(next_attempt_at, confirmed_at)
    for update skip locked
    limit least(greatest(p_limit, 1), 20)
  )
  update rsvps r set notification_claimed_at = now()
  from due where r.id = due.id
  returning r.*;
end;
$$;

revoke all on function public.claim_due_rsvp_notifications(integer) from public, anon, authenticated;
grant execute on function public.claim_due_rsvp_notifications(integer) to service_role;
