-- Add a separately configurable culture-information video to every E-Learning lesson.
alter table public.elearning_steps drop constraint if exists elearning_steps_step_type_check;
alter table public.elearning_steps add constraint elearning_steps_step_type_check
  check (step_type in ('overview','video','document','vocabulary','grammar','practice','culture_video','quiz','complete'));

update public.elearning_steps set sort_order = 9 where step_type = 'complete' and sort_order <> 9;
update public.elearning_steps set sort_order = 8 where step_type = 'quiz' and sort_order <> 8;

insert into public.elearning_steps (lesson_id, step_type, title, instructions, sort_order, is_required, is_published)
select id, 'culture_video', 'Video thông tin văn hóa',
  'Xem video để tìm hiểu nét văn hóa Hàn Quốc liên quan đến nội dung bài học.', 7, true, true
from public.elearning_lessons
on conflict (lesson_id, step_type) do update set
  title = excluded.title,
  sort_order = excluded.sort_order;
