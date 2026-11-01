alter table public.rate_limits
  drop constraint if exists rate_limits_bucket_check;

alter table public.rate_limits
  add constraint rate_limits_bucket_check
  check (bucket in ('rsvp', 'wish', 'admin'));
