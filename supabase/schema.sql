-- Run this in the Supabase SQL Editor for your project.
create table if not exists public.digests (
  thread_id bigint primary key,
  title text not null,
  digest_json jsonb not null,
  comment_count integer not null default 0,
  model text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.usage (
  day date not null default (now() at time zone 'utc')::date,
  key text not null,
  count integer not null default 0 check (count >= 0),
  primary key (day, key)
);

alter table public.digests enable row level security;
alter table public.usage enable row level security;
revoke all on table public.digests, public.usage from anon, authenticated;
grant select, insert on table public.digests to service_role;

-- Atomic quota reservation. The Worker calls this through Supabase RPC using
-- a Supabase secret key mapped to service_role; keep it server-side.
create or replace function public.reserve_generation(
  p_ip_hash text,
  p_ip_limit integer,
  p_global_limit integer
) returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_day date := (now() at time zone 'utc')::date;
  v_count integer;
begin
  insert into public.usage(day, key, count)
  values (v_day, 'global', 1)
  on conflict (day, key) do update
    set count = public.usage.count + 1
    where public.usage.count < p_global_limit
  returning count into v_count;

  if v_count is null then
    return 'global';
  end if;

  insert into public.usage(day, key, count)
  values (v_day, p_ip_hash, 1)
  on conflict (day, key) do update
    set count = public.usage.count + 1
    where public.usage.count < p_ip_limit
  returning count into v_count;

  if v_count is null then
    update public.usage
      set count = greatest(count - 1, 0)
      where day = v_day and key = 'global';
    return 'ip';
  end if;

  return 'ok';
end;
$$;

revoke all on function public.reserve_generation(text, integer, integer) from public, anon, authenticated;
grant execute on function public.reserve_generation(text, integer, integer) to service_role;
