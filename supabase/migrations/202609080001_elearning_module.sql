-- Independent E-Learning module. Existing textbook and practice flows are untouched.
create table if not exists public.elearning_courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  textbook_id uuid references public.textbooks(id) on delete set null,
  is_published boolean not null default false,
  sequential_learning boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.elearning_lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.elearning_courses(id) on delete cascade,
  textbook_unit_id uuid references public.textbook_units(id) on delete set null,
  lesson_number integer not null,
  title text not null,
  description text,
  estimated_minutes integer not null default 45 check (estimated_minutes > 0),
  pass_percent integer not null default 80 check (pass_percent between 0 and 100),
  sort_order integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(course_id, lesson_number)
);

create table if not exists public.elearning_steps (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.elearning_lessons(id) on delete cascade,
  step_type text not null check (step_type in ('overview','video','document','vocabulary','grammar','practice','quiz','complete')),
  title text not null,
  instructions text,
  content jsonb not null default '{}'::jsonb,
  youtube_url text,
  required_watch_percent integer not null default 85 check (required_watch_percent between 0 and 100),
  sort_order integer not null default 0,
  is_required boolean not null default true,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(lesson_id, step_type)
);

create table if not exists public.elearning_step_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  step_id uuid not null references public.elearning_steps(id) on delete cascade,
  status text not null default 'not_started' check (status in ('not_started','in_progress','completed','needs_review')),
  progress_percent integer not null default 0 check (progress_percent between 0 and 100),
  score numeric(6,2),
  watched_seconds integer not null default 0,
  started_at timestamptz,
  completed_at timestamptz,
  last_accessed_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  primary key(user_id, step_id)
);

create index if not exists elearning_lessons_course_sort_idx on public.elearning_lessons(course_id, sort_order);
create index if not exists elearning_steps_lesson_sort_idx on public.elearning_steps(lesson_id, sort_order);
create index if not exists elearning_progress_user_access_idx on public.elearning_step_progress(user_id, last_accessed_at desc);

alter table public.elearning_courses enable row level security;
alter table public.elearning_lessons enable row level security;
alter table public.elearning_steps enable row level security;
alter table public.elearning_step_progress enable row level security;

create policy "published elearning courses readable" on public.elearning_courses for select to authenticated using (is_published);
create policy "published elearning lessons readable" on public.elearning_lessons for select to authenticated using (is_published);
create policy "published elearning steps readable" on public.elearning_steps for select to authenticated using (is_published);
create policy "users own elearning progress" on public.elearning_step_progress for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into public.elearning_courses (slug, title, description, textbook_id, is_published)
select 'giao-trinh-quyen-1', 'E-Learning Giáo trình Quyển 1', 'Lộ trình học tuần tự theo Giáo trình EPS-TOPIK 2025 Quyển 1.', id, true
from public.textbooks where volume = 1
on conflict (slug) do update set textbook_id = excluded.textbook_id;

insert into public.elearning_lessons (course_id, textbook_unit_id, lesson_number, title, description, sort_order, is_published)
select c.id, u.id, u.unit_number, coalesce(u.title_vi, 'Bài ' || u.unit_number), u.title_ko, u.sort_order, true
from public.elearning_courses c join public.textbook_units u on u.textbook_id = c.textbook_id
where c.slug = 'giao-trinh-quyen-1' and u.is_published
on conflict (course_id, lesson_number) do update set textbook_unit_id = excluded.textbook_unit_id, title = excluded.title;

insert into public.elearning_steps (lesson_id, step_type, title, sort_order, is_required, is_published)
select l.id, s.step_type, s.title, s.sort_order, true, true
from public.elearning_lessons l
cross join (values
  ('overview','Mục tiêu bài học',1), ('video','Video bài giảng',2), ('document','Đọc giáo trình',3),
  ('vocabulary','Học từ vựng',4), ('grammar','Học ngữ pháp',5), ('practice','Luyện tập',6),
  ('quiz','Quiz cuối bài',7), ('complete','Hoàn thành bài',8)
) as s(step_type,title,sort_order)
join public.elearning_courses c on c.id = l.course_id
where c.slug = 'giao-trinh-quyen-1'
on conflict (lesson_id, step_type) do nothing;
