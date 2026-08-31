create extension if not exists pgcrypto;

create table if not exists public.textbooks (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title_ko text not null,
  title_vi text not null,
  volume smallint not null check (volume > 0),
  edition text not null default '2025',
  total_pages integer not null default 0 check (total_pages >= 0),
  cover_path text,
  source_hash text,
  metadata jsonb not null default '{}'::jsonb,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.textbook_units (
  id uuid primary key default gen_random_uuid(),
  textbook_id uuid not null references public.textbooks(id) on delete cascade,
  lesson_id uuid references public.lessons(id) on delete set null,
  unit_number integer not null,
  title_ko text,
  title_vi text,
  start_page integer not null,
  end_page integer not null,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (textbook_id, unit_number),
  check (start_page > 0 and end_page >= start_page)
);

create table if not exists public.textbook_pages (
  id uuid primary key default gen_random_uuid(),
  textbook_id uuid not null references public.textbooks(id) on delete cascade,
  page_number integer not null,
  image_path text not null,
  thumbnail_path text,
  width integer,
  height integer,
  ocr_text text,
  ocr_payload jsonb not null default '{}'::jsonb,
  checksum text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (textbook_id, page_number),
  check (page_number > 0)
);

create table if not exists public.textbook_sections (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.textbook_units(id) on delete cascade,
  kind text not null,
  title_ko text,
  title_vi text,
  start_page integer not null,
  end_page integer not null,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  unique (unit_id, kind, start_page)
);

create table if not exists public.textbook_resources (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.textbook_units(id) on delete cascade,
  section_id uuid references public.textbook_sections(id) on delete set null,
  kind text not null,
  title text not null,
  resource_url text,
  metadata jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  is_published boolean not null default false
);

create table if not exists public.user_textbook_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  textbook_id uuid not null references public.textbooks(id) on delete cascade,
  unit_id uuid references public.textbook_units(id) on delete set null,
  last_page integer not null default 1,
  progress_percent numeric(5,2) not null default 0 check (progress_percent between 0 and 100),
  completed_units integer[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (user_id, textbook_id)
);

create table if not exists public.user_textbook_bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  textbook_id uuid not null references public.textbooks(id) on delete cascade,
  page_number integer not null,
  note text,
  created_at timestamptz not null default now(),
  unique (user_id, textbook_id, page_number)
);

create table if not exists public.user_textbook_annotations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  textbook_id uuid not null references public.textbooks(id) on delete cascade,
  page_number integer not null,
  kind text not null default 'highlight',
  rect jsonb not null,
  content text,
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists textbook_units_book_sort_idx on public.textbook_units(textbook_id, sort_order);
create index if not exists textbook_pages_book_page_idx on public.textbook_pages(textbook_id, page_number);
create index if not exists textbook_pages_ocr_idx on public.textbook_pages using gin (to_tsvector('simple', coalesce(ocr_text, '')));
create index if not exists textbook_resources_unit_idx on public.textbook_resources(unit_id, sort_order);

alter table public.textbooks enable row level security;
alter table public.textbook_units enable row level security;
alter table public.textbook_pages enable row level security;
alter table public.textbook_sections enable row level security;
alter table public.textbook_resources enable row level security;
alter table public.user_textbook_progress enable row level security;
alter table public.user_textbook_bookmarks enable row level security;
alter table public.user_textbook_annotations enable row level security;

drop policy if exists "published textbooks are readable" on public.textbooks;
create policy "published textbooks are readable" on public.textbooks for select to authenticated using (is_published);
drop policy if exists "published units are readable" on public.textbook_units;
create policy "published units are readable" on public.textbook_units for select to authenticated using (is_published and exists (select 1 from public.textbooks t where t.id = textbook_id and t.is_published));
drop policy if exists "published pages are readable" on public.textbook_pages;
create policy "published pages are readable" on public.textbook_pages for select to authenticated using (exists (select 1 from public.textbooks t where t.id = textbook_id and t.is_published));
drop policy if exists "published sections are readable" on public.textbook_sections;
create policy "published sections are readable" on public.textbook_sections for select to authenticated using (exists (select 1 from public.textbook_units u join public.textbooks t on t.id = u.textbook_id where u.id = unit_id and u.is_published and t.is_published));
drop policy if exists "published resources are readable" on public.textbook_resources;
create policy "published resources are readable" on public.textbook_resources for select to authenticated using (is_published);

drop policy if exists "users own textbook progress" on public.user_textbook_progress;
create policy "users own textbook progress" on public.user_textbook_progress for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "users own textbook bookmarks" on public.user_textbook_bookmarks;
create policy "users own textbook bookmarks" on public.user_textbook_bookmarks for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "users own textbook annotations" on public.user_textbook_annotations;
create policy "users own textbook annotations" on public.user_textbook_annotations for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('textbooks', 'textbooks', false, 15728640, array['image/png', 'image/webp', 'image/jpeg', 'audio/mpeg'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
