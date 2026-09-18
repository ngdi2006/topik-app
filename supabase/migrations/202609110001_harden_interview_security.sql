-- Harden Second-round Interview access without deleting or rewriting data.

-- SECURITY DEFINER functions must never inherit PostgreSQL's PUBLIC execute grant.
revoke all on function public.grant_interview_access(uuid, uuid, integer, text, uuid, text) from public, anon, authenticated;
grant execute on function public.grant_interview_access(uuid, uuid, integer, text, uuid, text) to service_role;

create or replace function public.consume_interview_ai_quota(p_user_id uuid, p_amount integer default 1)
returns table(allowed boolean, used integer, daily_limit integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer := 0;
  v_used integer := 0;
  v_today date := (now() at time zone 'Asia/Bangkok')::date;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Unauthorized';
  end if;
  if p_amount < 1 or p_amount > 10 then
    raise exception 'Invalid quota amount';
  end if;

  select coalesce(p.daily_ai_limit, 10) into v_limit
  from public.user_interview_entitlements e
  left join public.interview_subscription_plans p on p.id = e.plan_id
  where e.user_id = p_user_id and e.status = 'active' and e.expires_at > now()
  order by e.expires_at desc limit 1;

  if v_limit is null or v_limit = 0 then
    return query select false, 0, coalesce(v_limit, 0);
    return;
  end if;

  insert into public.interview_ai_daily_usage(user_id, usage_date, used_count)
  values (p_user_id, v_today, 0)
  on conflict do nothing;

  select u.used_count into v_used
  from public.interview_ai_daily_usage u
  where u.user_id = p_user_id and u.usage_date = v_today
  for update;

  if v_used + p_amount > v_limit then
    return query select false, v_used, v_limit;
    return;
  end if;

  update public.interview_ai_daily_usage u
  set used_count = u.used_count + p_amount, updated_at = now()
  where u.user_id = p_user_id and u.usage_date = v_today
  returning u.used_count into v_used;

  return query select true, v_used, v_limit;
end;
$$;

revoke all on function public.consume_interview_ai_quota(uuid, integer) from public, anon;
grant execute on function public.consume_interview_ai_quota(uuid, integer) to authenticated, service_role;

create or replace function public.refund_interview_ai_quota(p_user_id uuid, p_amount integer default 1)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_used integer;
  v_today date := (now() at time zone 'Asia/Bangkok')::date;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then raise exception 'Unauthorized'; end if;
  if p_amount < 1 or p_amount > 10 then raise exception 'Invalid quota amount'; end if;
  update public.interview_ai_daily_usage u
  set used_count = greatest(0, u.used_count - p_amount), updated_at = now()
  where u.user_id = p_user_id and u.usage_date = v_today
  returning u.used_count into v_used;
  return coalesce(v_used, 0);
end;
$$;

revoke all on function public.refund_interview_ai_quota(uuid, integer) from public, anon;
grant execute on function public.refund_interview_ai_quota(uuid, integer) to authenticated, service_role;

-- Remove legacy policies that treated every authenticated account as an admin.
drop policy if exists "Allow public read access on interview_questions" on public.interview_questions;
drop policy if exists "Allow admin all access on interview_questions" on public.interview_questions;

create policy "Authorized users read interview questions"
on public.interview_questions for select to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'teacher', 'supporter')
  )
  or exists (
    select 1 from public.user_interview_entitlements e
    where e.user_id = auth.uid() and e.status = 'active' and e.expires_at > now()
  )
  or exists (
    select 1 from public.interview_free_content f
    where f.content_id = interview_questions.id and f.content_type = 'command' and f.is_active
  )
);

create policy "Admins manage interview questions"
on public.interview_questions for all to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "Allow public read access to vocabulary_vong2" on public.vocabulary_vong2;
drop policy if exists "Allow admin all access to vocabulary_vong2" on public.vocabulary_vong2;

create policy "Authorized users read interview vocabulary"
on public.vocabulary_vong2 for select to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'teacher', 'supporter')
  )
  or exists (
    select 1 from public.user_interview_entitlements e
    where e.user_id = auth.uid() and e.status = 'active' and e.expires_at > now()
  )
  or exists (
    select 1 from public.interview_free_content f
    where f.content_id = vocabulary_vong2.id
      and f.content_type in ('vocabulary', 'sign') and f.is_active
  )
);

create policy "Admins manage interview vocabulary"
on public.vocabulary_vong2 for all to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "Allow public read access on system_settings" on public.system_settings;
drop policy if exists "Allow admin all access on system_settings" on public.system_settings;

create policy "Authenticated users read system settings"
on public.system_settings for select to authenticated using (true);
create policy "Admins manage system settings"
on public.system_settings for all to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "Admins and teachers can read assignments" on public.interview_question_assignments;
create policy "Staff read relevant interview assignments"
on public.interview_question_assignments for select to authenticated
using (
  teacher_id = auth.uid()
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'supporter'))
);

drop policy if exists "Authenticated users can read history" on public.interview_question_history;
drop policy if exists "Authenticated users can insert history" on public.interview_question_history;
create policy "Staff read interview history"
on public.interview_question_history for select to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'teacher', 'supporter')));

-- Filters used by the learner and admin Interview APIs.
create index if not exists idx_interview_questions_category_industry_order
  on public.interview_questions(category, industry, order_index);
create index if not exists idx_interview_entitlement_active_lookup
  on public.user_interview_entitlements(user_id, expires_at desc)
  where status = 'active';

notify pgrst, 'reload schema';
