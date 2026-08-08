create table if not exists public.user_self_introduction_drafts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  mode text not null check (mode in ('experienced', 'beginner')),
  profile jsonb not null default '{}'::jsonb,
  text text not null,
  updated_at timestamptz not null default now()
);

alter table public.user_self_introduction_drafts enable row level security;

drop policy if exists "Users can read their self introduction" on public.user_self_introduction_drafts;
create policy "Users can read their self introduction"
  on public.user_self_introduction_drafts for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create their self introduction" on public.user_self_introduction_drafts;
create policy "Users can create their self introduction"
  on public.user_self_introduction_drafts for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their self introduction" on public.user_self_introduction_drafts;
create policy "Users can update their self introduction"
  on public.user_self_introduction_drafts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

