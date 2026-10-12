create table if not exists public.elearning_video_interactions (
  id uuid primary key default gen_random_uuid(),
  step_id uuid not null references public.elearning_steps(id) on delete cascade,
  timestamp_seconds integer not null default 0 check (timestamp_seconds >= 0),
  interaction_type text not null check (interaction_type in ('single_choice','true_false','info')),
  title text not null,
  prompt text not null,
  options jsonb not null default '[]'::jsonb,
  correct_answer jsonb,
  explanation text,
  is_required boolean not null default true,
  points integer not null default 1 check (points >= 0),
  sort_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(step_id, timestamp_seconds, title)
);

create table if not exists public.elearning_video_interaction_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  interaction_id uuid not null references public.elearning_video_interactions(id) on delete cascade,
  answer jsonb,
  is_correct boolean,
  score integer not null default 0,
  attempt_count integer not null default 1,
  completed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, interaction_id)
);

create index if not exists elearning_video_interactions_step_time_idx on public.elearning_video_interactions(step_id, timestamp_seconds, sort_order);
alter table public.elearning_video_interactions enable row level security;
alter table public.elearning_video_interaction_progress enable row level security;
create policy "published video interactions readable" on public.elearning_video_interactions for select to authenticated using (is_published);
create policy "users own video interaction progress" on public.elearning_video_interaction_progress for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
