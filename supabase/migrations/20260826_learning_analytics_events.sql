-- Learning analytics event stream.
-- Stores compact, append-only events for funnels, retention and content quality.

create table if not exists public.learning_analytics_events (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    event_name text not null check (event_name in (
        'lesson_started', 'lesson_completed',
        'exam_started', 'exam_completed',
        'question_answered', 'question_skipped',
        'practice_started', 'practice_completed', 'practice_retried'
    )),
    source text not null default 'web',
    content_type text,
    content_id text,
    session_id text,
    duration_ms integer check (duration_ms is null or duration_ms >= 0),
    is_correct boolean,
    metadata jsonb not null default '{}'::jsonb,
    occurred_at timestamptz not null default now(),
    created_at timestamptz not null default now()
);

create index if not exists idx_learning_events_user_time
    on public.learning_analytics_events (user_id, occurred_at desc);
create index if not exists idx_learning_events_name_time
    on public.learning_analytics_events (event_name, occurred_at desc);
create index if not exists idx_learning_events_content
    on public.learning_analytics_events (content_type, content_id, occurred_at desc);
create index if not exists idx_learning_events_question_quality
    on public.learning_analytics_events (content_id, is_correct)
    where event_name in ('question_answered', 'question_skipped');

alter table public.learning_analytics_events enable row level security;

drop policy if exists "Users can insert own learning events" on public.learning_analytics_events;
create policy "Users can insert own learning events"
    on public.learning_analytics_events for insert
    to authenticated
    with check (auth.uid() = user_id);

drop policy if exists "Users can view own learning events" on public.learning_analytics_events;
create policy "Users can view own learning events"
    on public.learning_analytics_events for select
    to authenticated
    using (auth.uid() = user_id);

drop policy if exists "Staff can view learning events" on public.learning_analytics_events;
create policy "Staff can view learning events"
    on public.learning_analytics_events for select
    to authenticated
    using (
        exists (
            select 1 from public.profiles
            where profiles.id = auth.uid()
              and profiles.role in ('admin', 'teacher', 'supporter')
        )
    );

comment on table public.learning_analytics_events is
    'Append-only learning activity events used by admin analytics.';
