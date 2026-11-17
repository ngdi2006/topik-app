-- Standalone campus module. Apply through the usual Supabase migration workflow.
begin;
create table public.campus_rooms (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  kind text not null check (kind in ('classroom','exam')),
  capacity integer not null default 30 check (capacity between 1 and 120),
  mode text not null default 'self' check (mode in ('self','live')),
  teacher_id uuid references public.profiles(id) on delete set null,
  meeting_url text check (meeting_url is null or (length(meeting_url) <= 1000 and meeting_url ~ '^https://')),
  exam_id uuid references public.exams(id) on delete set null,
  phase text not null default 'waiting' check (phase in ('waiting','teaching','ended')),
  step integer not null default 0 check (step between 0 and 3),
  created_at timestamptz not null default now()
);
create table public.campus_memberships (
  id bigint generated always as identity primary key,
  room_id uuid not null references public.campus_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('admitted','waiting','left')),
  seat integer check (seat > 0),
  queued_at timestamptz not null default clock_timestamp(),
  unique(room_id,user_id),
  check ((status = 'admitted' and seat is not null) or (status <> 'admitted' and seat is null))
);
create unique index campus_unique_seat on public.campus_memberships(room_id,seat) where status='admitted';
create index campus_fifo on public.campus_memberships(room_id,status,queued_at,id);
create table public.campus_progress (
  room_id uuid not null references public.campus_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  score integer not null check (score between 0 and 3),
  completed_at timestamptz,
  primary key(room_id,user_id)
);
alter table public.campus_rooms enable row level security;
alter table public.campus_memberships enable row level security;
alter table public.campus_progress enable row level security;
-- All access goes through the bounded RPCs below; no direct client writes.
revoke all on public.campus_rooms, public.campus_memberships, public.campus_progress from anon, authenticated;

create function public.campus_snapshot() returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := auth.uid(); result jsonb;
begin
  if uid is null then raise exception 'Vui lòng đăng nhập.'; end if;
  select jsonb_build_object(
    'userId', uid,
    'role', coalesce((select role from public.profiles where id=uid),'learner'),
    'rooms', coalesce((select jsonb_agg(to_jsonb(r) || jsonb_build_object(
      'occupied',(select count(*) from public.campus_memberships m where m.room_id=r.id and m.status='admitted'),
      'queued',(select count(*) from public.campus_memberships m where m.room_id=r.id and m.status='waiting')
    ) order by r.kind,r.created_at,r.id) from public.campus_rooms r),'[]'::jsonb),
    'memberships', coalesce((select jsonb_agg(jsonb_build_object(
      'room_id',m.room_id,'status',m.status,'seat',m.seat,
      'position',case when m.status='waiting' then (select count(*) from public.campus_memberships q
        where q.room_id=m.room_id and q.status='waiting' and (q.queued_at,q.id)<=(m.queued_at,m.id)) else null end
    )) from public.campus_memberships m where m.user_id=uid and m.status<>'left'),'[]'::jsonb),
    'progress', coalesce((select jsonb_agg(jsonb_build_object('room_id',p.room_id,'score',p.score,'completed_at',p.completed_at))
      from public.campus_progress p where p.user_id=uid),'[]'::jsonb),
    'seats', coalesce((select jsonb_agg(jsonb_build_object('room_id',m.room_id,'seat',m.seat))
      from public.campus_memberships m where m.status='admitted' and exists
      (select 1 from public.campus_memberships own where own.room_id=m.room_id and own.user_id=uid and own.status='admitted')),'[]'::jsonb)
  ) into result;
  return result;
end $$;

create function public.campus_action(p_room uuid, p_action text, p_data jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  uid uuid := auth.uid(); r public.campus_rooms; member public.campus_memberships;
  next_user uuid; free_seat integer; new_capacity integer; user_role text; score_value integer;
begin
  if uid is null then raise exception 'Vui lòng đăng nhập.'; end if;
  -- Every mutation locks the room: admission, FIFO promotion and resizing are atomic.
  select * into r from public.campus_rooms where id=p_room for update;
  if not found then raise exception 'Không tìm thấy phòng.'; end if;
  select role into user_role from public.profiles where id=uid;
  select * into member from public.campus_memberships where room_id=p_room and user_id=uid;

  if p_action='join' then
    if r.phase='ended' and r.mode='live' then raise exception 'Buổi học đã kết thúc.'; end if;
    if member.id is null then
      insert into public.campus_memberships(room_id,user_id,status) values(p_room,uid,'waiting');
    elsif member.status='left' then
      update public.campus_memberships set status='waiting',seat=null,queued_at=clock_timestamp() where id=member.id;
    end if;
  elsif p_action='leave' then
    update public.campus_memberships set status='left',seat=null where room_id=p_room and user_id=uid;
  elsif p_action='configure' then
    if user_role is distinct from 'admin' then raise exception 'Chỉ quản trị viên được cấu hình phòng.'; end if;
    new_capacity := (p_data->>'capacity')::integer;
    if new_capacity is null or new_capacity not between 1 and 120 then raise exception 'Sức chứa phải từ 1 đến 120.'; end if;
    if exists(select 1 from public.campus_memberships where room_id=p_room and status='admitted' and seat>new_capacity)
      then raise exception 'Không thể giảm sức chứa xuống dưới số ghế đang được cấp.'; end if;
    if p_data->>'mode' not in ('self','live') or p_data->>'mode' is null then raise exception 'Chế độ không hợp lệ.'; end if;
    if nullif(p_data->>'teacher_id','') is not null and not exists(
      select 1 from public.profiles where id=(p_data->>'teacher_id')::uuid and role in ('admin','teacher')
    ) then raise exception 'Tài khoản được phân công phải là giáo viên hoặc quản trị viên.'; end if;
    update public.campus_rooms set capacity=new_capacity, mode=p_data->>'mode',
      teacher_id=nullif(p_data->>'teacher_id','')::uuid, meeting_url=nullif(p_data->>'meeting_url',''),
      exam_id=nullif(p_data->>'exam_id','')::uuid where id=p_room;
  elsif p_action='teach' then
    if user_role is distinct from 'admin' and not coalesce(user_role='teacher' and r.teacher_id=uid,false) then
      raise exception 'Bạn không được phân công điều khiển lớp này.';
    end if;
    if p_data->>'phase' is null or p_data->>'phase' not in ('waiting','teaching','ended')
      or p_data->>'step' is null or (p_data->>'step')::integer not between 0 and 3 then raise exception 'Trạng thái buổi học không hợp lệ.'; end if;
    update public.campus_rooms set phase=p_data->>'phase',step=(p_data->>'step')::integer where id=p_room;
  elsif p_action='quiz' then
    if member.status is distinct from 'admitted' or r.kind<>'classroom' then raise exception 'Bạn chưa có chỗ trong lớp.'; end if;
    if r.mode='live' and (r.phase<>'teaching' or r.step<>2) then raise exception 'Giáo viên chưa mở quiz.'; end if;
    if jsonb_typeof(p_data->'answers') is distinct from 'array' or jsonb_array_length(p_data->'answers')<>3 then
      raise exception 'Vui lòng trả lời đủ ba câu hỏi.'; end if;
    score_value := (case when p_data->'answers'->>0='1' then 1 else 0 end)
      + (case when p_data->'answers'->>1='0' then 1 else 0 end)
      + (case when p_data->'answers'->>2='2' then 1 else 0 end);
    insert into public.campus_progress(room_id,user_id,score) values(p_room,uid,score_value)
      on conflict(room_id,user_id) do update set score=greatest(campus_progress.score,excluded.score);
  elsif p_action='complete' then
    if member.status is distinct from 'admitted' or r.kind<>'classroom' then raise exception 'Bạn chưa có chỗ trong lớp.'; end if;
    if r.mode='live' and not (r.phase='ended' or (r.phase='teaching' and r.step=3)) then raise exception 'Buổi học chưa đến phần tổng kết.'; end if;
    update public.campus_progress set completed_at=coalesce(completed_at,now()) where room_id=p_room and user_id=uid and score>=2;
    if not found then raise exception 'Cần trả lời đúng ít nhất 2/3 câu quiz.'; end if;
  else raise exception 'Thao tác không hợp lệ.';
  end if;

  select * into r from public.campus_rooms where id=p_room;
  loop
    select n into free_seat from generate_series(1,r.capacity) n where not exists(
      select 1 from public.campus_memberships where room_id=p_room and status='admitted' and seat=n
    ) order by n limit 1;
    exit when free_seat is null;
    select user_id into next_user from public.campus_memberships where room_id=p_room and status='waiting' order by queued_at,id limit 1;
    exit when next_user is null;
    update public.campus_memberships set status='admitted',seat=free_seat where room_id=p_room and user_id=next_user;
  end loop;
  return public.campus_snapshot();
end $$;
revoke all on function public.campus_snapshot() from public, anon;
revoke all on function public.campus_action(uuid,text,jsonb) from public, anon;
grant execute on function public.campus_snapshot() to authenticated;
grant execute on function public.campus_action(uuid,text,jsonb) to authenticated;

insert into public.campus_rooms(title,kind,mode) values
  ('Lớp tiếng Hàn · A101','classroom','self'),
  ('Phòng thi thử · T201','exam','self');
commit;
