-- Timed access packages for Second-round Interview. Kept separate from exam credits.
create extension if not exists pgcrypto;

create table if not exists public.interview_subscription_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  duration_days integer not null check (duration_days > 0),
  price_vnd integer not null check (price_vnd >= 0),
  daily_ai_limit integer not null default 10 check (daily_ai_limit >= 0),
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.interview_subscription_plans(code, name, duration_days, price_vnd, daily_ai_limit, display_order)
values
  ('INTERVIEW_10D', 'Luyện Phỏng vấn Vòng 2 - 10 ngày', 10, 49000, 10, 1),
  ('INTERVIEW_30D', 'Luyện Phỏng vấn Vòng 2 - 30 ngày', 30, 99000, 10, 2)
on conflict (code) do update set
  name = excluded.name,
  duration_days = excluded.duration_days,
  price_vnd = excluded.price_vnd,
  daily_ai_limit = excluded.daily_ai_limit;

create table if not exists public.user_interview_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid references public.interview_subscription_plans(id) on delete set null,
  starts_at timestamptz not null,
  expires_at timestamptz not null,
  status text not null default 'active' check (status in ('active','expired','revoked')),
  source text not null check (source in ('sepay','admin_internal','promotion')),
  granted_by uuid references auth.users(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_interview_entitlement_user_expiry
  on public.user_interview_entitlements(user_id, expires_at desc);

create table if not exists public.interview_entitlement_history (
  id uuid primary key default gen_random_uuid(),
  entitlement_id uuid references public.user_interview_entitlements(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  source text not null,
  days integer,
  previous_expires_at timestamptz,
  new_expires_at timestamptz,
  performed_by uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.interview_free_content (
  id uuid primary key default gen_random_uuid(),
  content_type text not null check (content_type in ('command','vocabulary','sign')),
  content_id uuid not null,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(content_type, content_id)
);

create table if not exists public.interview_ai_daily_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null,
  used_count integer not null default 0 check (used_count >= 0),
  updated_at timestamptz not null default now(),
  primary key(user_id, usage_date)
);

create table if not exists public.interview_api_usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  feature text not null,
  provider text not null,
  request_id text,
  character_count integer not null default 0,
  audio_seconds numeric(10,2),
  input_tokens integer,
  output_tokens integer,
  estimated_cost_usd numeric(12,6),
  cache_hit boolean not null default false,
  status text not null,
  latency_ms integer,
  content_hash text,
  created_at timestamptz not null default now()
);
create index if not exists idx_interview_api_usage_user_created
  on public.interview_api_usage_logs(user_id, created_at desc);

create table if not exists public.user_device_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id text not null,
  device_name text,
  user_agent text,
  last_ip inet,
  last_active_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  unique(user_id, device_id)
);

alter table public.payment_transactions
  add column if not exists product_type text not null default 'exam_credit',
  add column if not exists interview_plan_id uuid references public.interview_subscription_plans(id) on delete set null,
  add column if not exists duration_days_snapshot integer,
  add column if not exists package_name_snapshot text,
  add column if not exists activation_status text;

create or replace function public.grant_interview_access(
  p_user_id uuid,
  p_plan_id uuid,
  p_days integer,
  p_source text,
  p_performed_by uuid default null,
  p_notes text default null
) returns public.user_interview_entitlements
language plpgsql security definer set search_path = public as $$
declare
  v_previous timestamptz;
  v_start timestamptz := now();
  v_expiry timestamptz;
  v_entitlement public.user_interview_entitlements;
begin
  if p_days <= 0 then raise exception 'Days must be positive'; end if;
  select max(expires_at) into v_previous
  from public.user_interview_entitlements
  where user_id = p_user_id and status = 'active' and expires_at > now();
  v_expiry := greatest(coalesce(v_previous, now()), now()) + make_interval(days => p_days);
  insert into public.user_interview_entitlements
    (user_id, plan_id, starts_at, expires_at, status, source, granted_by, notes)
  values (p_user_id, p_plan_id, v_start, v_expiry, 'active', p_source, p_performed_by, p_notes)
  returning * into v_entitlement;
  insert into public.interview_entitlement_history
    (entitlement_id, user_id, action, source, days, previous_expires_at, new_expires_at, performed_by)
  values (v_entitlement.id, p_user_id, 'grant', p_source, p_days, v_previous, v_expiry, p_performed_by);
  return v_entitlement;
end; $$;

create or replace function public.consume_interview_ai_quota(p_user_id uuid, p_amount integer default 1)
returns table(allowed boolean, used integer, daily_limit integer)
language plpgsql security definer set search_path = public as $$
declare
  v_limit integer := 0;
  v_used integer := 0;
  v_today date := (now() at time zone 'Asia/Bangkok')::date;
begin
  select coalesce(p.daily_ai_limit, 10) into v_limit
  from public.user_interview_entitlements e
  left join public.interview_subscription_plans p on p.id = e.plan_id
  where e.user_id = p_user_id and e.status = 'active' and e.expires_at > now()
  order by e.expires_at desc limit 1;
  if v_limit is null or v_limit = 0 then return query select false, 0, coalesce(v_limit,0); return; end if;
  insert into public.interview_ai_daily_usage(user_id, usage_date, used_count)
  values(p_user_id, v_today, 0) on conflict do nothing;
  select used_count into v_used from public.interview_ai_daily_usage
  where user_id = p_user_id and usage_date = v_today for update;
  if v_used + p_amount > v_limit then return query select false, v_used, v_limit; return; end if;
  update public.interview_ai_daily_usage set used_count = used_count + p_amount, updated_at = now()
  where user_id = p_user_id and usage_date = v_today returning used_count into v_used;
  return query select true, v_used, v_limit;
end; $$;

alter table public.interview_subscription_plans enable row level security;
alter table public.user_interview_entitlements enable row level security;
alter table public.interview_entitlement_history enable row level security;
alter table public.interview_free_content enable row level security;
alter table public.interview_ai_daily_usage enable row level security;
alter table public.interview_api_usage_logs enable row level security;
alter table public.user_device_sessions enable row level security;

create policy "Read active interview plans" on public.interview_subscription_plans for select using (is_active);
create policy "Read own interview entitlement" on public.user_interview_entitlements for select using (auth.uid() = user_id);
create policy "Read own interview history" on public.interview_entitlement_history for select using (auth.uid() = user_id);
create policy "Read free interview content" on public.interview_free_content for select using (is_active);
create policy "Read own AI usage" on public.interview_ai_daily_usage for select using (auth.uid() = user_id);
create policy "Read own device sessions" on public.user_device_sessions for select using (auth.uid() = user_id);

