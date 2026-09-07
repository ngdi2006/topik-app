create table if not exists public.textbook_vocabulary (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.textbook_units(id) on delete cascade,
  word_ko text not null,
  meaning_vi text not null default '',
  pronunciation text,
  part_of_speech text,
  topic text,
  example_ko text,
  example_vi text,
  audio_url text,
  image_url text,
  source_page integer,
  source_kind text not null default 'ocr' check (source_kind in ('ocr', 'manual', 'import')),
  review_status text not null default 'pending' check (review_status in ('pending', 'reviewed', 'rejected')),
  sort_order integer not null default 0,
  is_published boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (unit_id, word_ko)
);

create table if not exists public.user_vocabulary_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  vocabulary_id uuid not null references public.textbook_vocabulary(id) on delete cascade,
  learning_state text not null default 'new' check (learning_state in ('new', 'learning', 'review', 'mastered', 'relearning')),
  ease_factor numeric(4,2) not null default 2.50,
  interval_days integer not null default 0,
  due_at timestamptz not null default now(),
  correct_count integer not null default 0,
  incorrect_count integer not null default 0,
  streak integer not null default 0,
  last_mode text,
  last_reviewed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, vocabulary_id)
);

create index if not exists textbook_vocabulary_unit_sort_idx
  on public.textbook_vocabulary(unit_id, sort_order);
create index if not exists user_vocabulary_due_idx
  on public.user_vocabulary_progress(user_id, due_at);

alter table public.textbook_vocabulary enable row level security;
alter table public.user_vocabulary_progress enable row level security;

drop policy if exists "published textbook vocabulary is readable" on public.textbook_vocabulary;
create policy "published textbook vocabulary is readable"
  on public.textbook_vocabulary for select to authenticated
  using (is_published and review_status = 'reviewed');

drop policy if exists "users own vocabulary progress" on public.user_vocabulary_progress;
create policy "users own vocabulary progress"
  on public.user_vocabulary_progress for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
