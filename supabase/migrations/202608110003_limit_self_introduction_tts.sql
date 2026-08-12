-- Limit user-triggered ElevenLabs generations for personal introductions.
-- Replaying an existing cached MP3 never inserts a row and never consumes quota.
create table if not exists public.self_introduction_tts_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  text_hash text not null,
  storage_path text not null,
  created_at timestamptz not null default now(),
  unique (user_id, text_hash)
);

create index if not exists idx_self_intro_tts_user_created
  on public.self_introduction_tts_generations(user_id, created_at desc);

alter table public.self_introduction_tts_generations enable row level security;

drop policy if exists "Users can read own self introduction TTS usage"
  on public.self_introduction_tts_generations;
create policy "Users can read own self introduction TTS usage"
  on public.self_introduction_tts_generations for select
  using (auth.uid() = user_id);

create or replace function public.reserve_self_introduction_tts_generation(
  p_user_id uuid,
  p_text_hash text,
  p_storage_path text,
  p_daily_limit integer
) returns table(allowed boolean, used integer, daily_limit integer, counted boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_used integer;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Unauthorized';
  end if;
  if p_daily_limit < 1 or p_daily_limit > 20 then
    raise exception 'Invalid daily limit';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_user_id::text || current_date::text));

  if exists (
    select 1 from public.self_introduction_tts_generations
    where user_id = p_user_id and text_hash = p_text_hash
  ) then
    select count(*)::integer into v_used
    from public.self_introduction_tts_generations
    where user_id = p_user_id
      and (created_at at time zone 'Asia/Bangkok')::date =
          (now() at time zone 'Asia/Bangkok')::date;
    return query select true, v_used, p_daily_limit, false;
    return;
  end if;

  select count(*)::integer into v_used
  from public.self_introduction_tts_generations
  where user_id = p_user_id
    and (created_at at time zone 'Asia/Bangkok')::date =
        (now() at time zone 'Asia/Bangkok')::date;

  if v_used >= p_daily_limit then
    return query select false, v_used, p_daily_limit, false;
    return;
  end if;

  insert into public.self_introduction_tts_generations(user_id, text_hash, storage_path)
  values (p_user_id, p_text_hash, p_storage_path)
  on conflict (user_id, text_hash) do nothing;

  return query select true, v_used + 1, p_daily_limit, true;
end;
$$;

revoke all on function public.reserve_self_introduction_tts_generation(uuid, text, text, integer) from public;
grant execute on function public.reserve_self_introduction_tts_generation(uuid, text, text, integer) to authenticated;
