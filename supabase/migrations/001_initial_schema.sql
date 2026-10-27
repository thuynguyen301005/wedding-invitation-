create extension if not exists pgcrypto;

create table if not exists public.rsvps (
  id uuid primary key default gen_random_uuid(),
  guest_token uuid not null unique,
  name varchar(100) not null,
  attendance_status text not null check (attendance_status in ('yes', 'no')),
  guest_count smallint not null check (guest_count between 0 and 10),
  message varchar(500),
  revision integer not null default 1 check (revision > 0),
  confirmed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  notification_status text not null default 'not_required'
    check (notification_status in ('pending', 'sent', 'failed', 'not_required')),
  notification_attempts smallint not null default 0,
  next_attempt_at timestamptz,
  last_error_code text,
  possible_duplicate boolean not null default false,
  notification_claimed_at timestamptz,
  check ((attendance_status = 'yes' and guest_count between 1 and 10) or (attendance_status = 'no' and guest_count = 0))
);

create table if not exists public.idempotency_keys (
  idempotency_key uuid primary key,
  rsvp_id uuid not null references public.rsvps(id) on delete cascade,
  response jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.wishes (
  id uuid primary key default gen_random_uuid(),
  sender_name varchar(100) not null,
  content varchar(500) not null,
  display_status text not null default 'visible' check (display_status in ('visible', 'hidden')),
  guest_token uuid not null,
  ip_hash text,
  created_at timestamptz not null default now()
);

create index if not exists wishes_visible_created_idx
  on public.wishes (created_at desc, id desc) where display_status = 'visible';
create index if not exists rsvps_pending_due_idx
  on public.rsvps (next_attempt_at) where notification_status = 'pending';

create table if not exists public.rate_limits (
  ip_hash text not null,
  bucket text not null check (bucket in ('rsvp', 'wish')),
  window_started_at timestamptz not null,
  request_count integer not null default 0,
  primary key (ip_hash, bucket)
);
create table if not exists public.guest_rate_limits (
  guest_token uuid primary key,
  window_started_at timestamptz not null,
  request_count integer not null default 0
);

alter table public.rsvps enable row level security;
alter table public.idempotency_keys enable row level security;
alter table public.wishes enable row level security;
alter table public.rate_limits enable row level security;
alter table public.guest_rate_limits enable row level security;
revoke all on public.rsvps, public.idempotency_keys, public.wishes,
  public.rate_limits, public.guest_rate_limits from anon, authenticated;

create or replace function public.consume_rate_limit(
  p_ip_hash text,
  p_bucket text,
  p_ip_limit integer,
  p_guest_token uuid
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  ip_count integer;
  guest_count integer;
  window_start timestamptz;
begin
  insert into rate_limits(ip_hash, bucket, window_started_at, request_count)
  values (p_ip_hash, p_bucket, now(), 1)
  on conflict (ip_hash, bucket) do update
  set request_count = case when rate_limits.window_started_at < now() - interval '1 hour'
      then 1 else rate_limits.request_count + 1 end,
      window_started_at = case when rate_limits.window_started_at < now() - interval '1 hour'
      then now() else rate_limits.window_started_at end
  returning request_count, window_started_at into ip_count, window_start;

  if p_guest_token is not null then
    insert into guest_rate_limits(guest_token, window_started_at, request_count)
    values (p_guest_token, now(), 1)
    on conflict (guest_token) do update
    set request_count = case when guest_rate_limits.window_started_at < now() - interval '1 hour'
        then 1 else guest_rate_limits.request_count + 1 end,
        window_started_at = case when guest_rate_limits.window_started_at < now() - interval '1 hour'
        then now() else guest_rate_limits.window_started_at end
    returning request_count into guest_count;
  else
    guest_count := 1;
  end if;
  return jsonb_build_object(
    'allowed', ip_count <= p_ip_limit and guest_count <= 5,
    'retry_after', greatest(1, ceil(extract(epoch from (window_start + interval '1 hour' - now())))::integer)
  );
end;
$$;

create or replace function public.save_rsvp(
  p_name text,
  p_attendance_status text,
  p_guest_count integer,
  p_message text,
  p_guest_token uuid,
  p_idempotency_key uuid,
  p_notify_on_decline boolean
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  saved public.rsvps%rowtype;
  previous_status text;
  cached jsonb;
  should_notify boolean;
  was_updated boolean;
  duplicate_name boolean;
  result jsonb;
begin
  perform pg_advisory_xact_lock(hashtext(p_idempotency_key::text));
  delete from idempotency_keys where created_at < now() - interval '24 hours';
  select response into cached from idempotency_keys where idempotency_key = p_idempotency_key;
  if cached is not null then
    return cached || jsonb_build_object('idempotent', true);
  end if;

  select * into saved from rsvps where guest_token = p_guest_token for update;
  was_updated := found;
  previous_status := saved.attendance_status;

  if was_updated then
    should_notify := p_attendance_status = 'yes'
      or (previous_status = 'yes' and p_attendance_status = 'no')
      or (p_notify_on_decline and p_attendance_status = 'no' and previous_status is null);
    update rsvps set
      name = p_name,
      attendance_status = p_attendance_status,
      guest_count = p_guest_count,
      message = p_message,
      revision = revision + 1,
      confirmed_at = now(),
      notification_status = case when should_notify then 'pending'
        when previous_status = 'no' and p_attendance_status = 'no' then 'not_required'
        else 'not_required' end,
      notification_attempts = 0,
      next_attempt_at = null,
      last_error_code = null,
      notification_claimed_at = null
    where id = saved.id returning * into saved;
  else
    should_notify := p_attendance_status = 'yes' or p_notify_on_decline;
    select exists(select 1 from rsvps where lower(name) = lower(p_name)) into duplicate_name;
    insert into rsvps(
      guest_token, name, attendance_status, guest_count, message, notification_status,
      possible_duplicate
    ) values (
      p_guest_token, p_name, p_attendance_status, p_guest_count, p_message,
      case when should_notify then 'pending' else 'not_required' end,
      duplicate_name
    ) returning * into saved;
  end if;

  result := jsonb_build_object(
    'id', saved.id, 'name', saved.name, 'attendance_status', saved.attendance_status,
    'guest_count', saved.guest_count, 'message', saved.message, 'confirmed_at', saved.confirmed_at,
    'revision', saved.revision, 'notification_status', saved.notification_status,
    'should_notify', should_notify, 'updated', was_updated, 'idempotent', false
  );
  insert into idempotency_keys(idempotency_key, rsvp_id, response)
  values (p_idempotency_key, saved.id, result)
  on conflict (idempotency_key) do nothing;
  return result;
end;
$$;

create or replace function public.finish_rsvp_notification(
  p_rsvp_id uuid,
  p_revision integer,
  p_sent boolean,
  p_permanent boolean,
  p_error_code text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  current_attempts integer;
  retry_minutes integer[];
begin
  select notification_attempts into current_attempts
  from rsvps where id = p_rsvp_id and revision = p_revision for update;
  if not found then return; end if;

  if p_sent then
    update rsvps set notification_status = 'sent', notification_attempts = current_attempts + 1,
      next_attempt_at = null,
      last_error_code = null, notification_claimed_at = null
    where id = p_rsvp_id and revision = p_revision;
    return;
  end if;

  current_attempts := current_attempts + 1;
  retry_minutes := array[1, 5, 15];
  if p_permanent or current_attempts >= 4 then
    update rsvps set notification_status = 'failed', notification_attempts = current_attempts,
      next_attempt_at = null, last_error_code = left(p_error_code, 100),
      notification_claimed_at = null
    where id = p_rsvp_id and revision = p_revision;
  else
    update rsvps set notification_status = 'pending', notification_attempts = current_attempts,
      next_attempt_at = now() + make_interval(mins => retry_minutes[current_attempts]),
      last_error_code = left(p_error_code, 100), notification_claimed_at = null
    where id = p_rsvp_id and revision = p_revision;
  end if;
end;
$$;

create or replace function public.claim_due_rsvp_notifications(p_limit integer default 20)
returns setof public.rsvps
language plpgsql security definer set search_path = public as $$
begin
  return query
  with due as (
    select id from rsvps
    where notification_status = 'pending'
      and next_attempt_at <= now()
      and (notification_claimed_at is null or notification_claimed_at < now() - interval '2 minutes')
    order by next_attempt_at
    for update skip locked
    limit least(greatest(p_limit, 1), 20)
  )
  update rsvps r set notification_claimed_at = now()
  from due where r.id = due.id
  returning r.*;
end;
$$;

create or replace function public.public_rsvp_count()
returns integer language sql security definer set search_path = public as $$
  select coalesce(sum(guest_count), 0)::integer from rsvps where attendance_status = 'yes';
$$;

revoke all on function public.consume_rate_limit(text, text, integer, uuid) from public, anon, authenticated;
revoke all on function public.save_rsvp(text, text, integer, text, uuid, uuid, boolean) from public, anon, authenticated;
revoke all on function public.finish_rsvp_notification(uuid, integer, boolean, boolean, text) from public, anon, authenticated;
revoke all on function public.claim_due_rsvp_notifications(integer) from public, anon, authenticated;
revoke all on function public.public_rsvp_count() from public, anon, authenticated;

grant execute on function public.consume_rate_limit(text, text, integer, uuid) to service_role;
grant execute on function public.save_rsvp(text, text, integer, text, uuid, uuid, boolean) to service_role;
grant execute on function public.finish_rsvp_notification(uuid, integer, boolean, boolean, text) to service_role;
grant execute on function public.claim_due_rsvp_notifications(integer) to service_role;
grant execute on function public.public_rsvp_count() to service_role;
