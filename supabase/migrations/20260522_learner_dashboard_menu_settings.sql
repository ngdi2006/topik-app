create table if not exists public.learner_dashboard_menu_settings (
    key text primary key,
    label text not null,
    is_enabled boolean not null default true,
    sort_order integer not null default 0,
    updated_at timestamptz not null default now()
);

insert into public.learner_dashboard_menu_settings (key, label, is_enabled, sort_order)
values
    ('bai-hoc', 'Bài học', true, 1),
    ('luyen-tap', 'Luyện Tập', true, 2),
    ('thi-thu', 'Thi Thử', true, 3),
    ('ai-chat', 'Luyện giao tiếp AI', true, 4),
    ('kiem-tra', 'Kiểm Tra', true, 5)
on conflict (key) do update
set
    label = excluded.label,
    sort_order = excluded.sort_order;

create or replace function public.set_learner_dashboard_menu_settings_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists set_learner_dashboard_menu_settings_updated_at
on public.learner_dashboard_menu_settings;

create trigger set_learner_dashboard_menu_settings_updated_at
before update on public.learner_dashboard_menu_settings
for each row
execute function public.set_learner_dashboard_menu_settings_updated_at();
