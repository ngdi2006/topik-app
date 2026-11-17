begin;
alter table public.campus_rooms
  add column exam_title text not null default '' check (char_length(exam_title)<=160),
  add column exam_description text not null default '' check (char_length(exam_description)<=1000),
  add column exam_instructions text not null default '' check (char_length(exam_instructions)<=4000);

-- Content editing is separate from capacity/teacher assignment, which remain admin-only.
create function public.campus_exam_options(p_room uuid, p_search text default '') returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid(); r public.campus_rooms; user_role text; result jsonb;
begin
  if uid is null then raise exception 'Vui lòng đăng nhập.'; end if;
  select * into r from public.campus_rooms where id=p_room and kind='exam';
  if not found then raise exception 'Không tìm thấy phòng thi.'; end if;
  select role into user_role from public.profiles where id=uid;
  if user_role is distinct from 'admin' and not coalesce(user_role='teacher' and r.teacher_id=uid,false) then
    raise exception 'Bạn không được phân công cấu hình phòng thi này.';
  end if;
  select coalesce(jsonb_agg(to_jsonb(e)),'[]'::jsonb) into result from (
    select id,title,status from public.exams
    where status in ('Published','Internal') and (id=r.exam_id or title ilike '%'||left(coalesce(p_search,''),120)||'%')
    order by (id=r.exam_id) desc nulls last, title,id limit 100
  ) e;
  return result;
end $$;

create function public.campus_exam_setup(p_room uuid,p_data jsonb) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid(); r public.campus_rooms; user_role text; selected_exam uuid;
  heading text:=btrim(p_data->>'exam_title'); description text:=coalesce(p_data->>'exam_description','');
  instructions text:=coalesce(p_data->>'exam_instructions','');
begin
  if uid is null then raise exception 'Vui lòng đăng nhập.'; end if;
  select * into r from public.campus_rooms where id=p_room and kind='exam' for update;
  if not found then raise exception 'Không tìm thấy phòng thi.'; end if;
  select role into user_role from public.profiles where id=uid;
  if user_role is distinct from 'admin' and not coalesce(user_role='teacher' and r.teacher_id=uid,false) then
    raise exception 'Bạn không được phân công cấu hình phòng thi này.';
  end if;
  if heading is null or char_length(heading) not between 1 and 160 or char_length(description)>1000 or char_length(instructions)>4000 then
    raise exception 'Tiêu đề cần 1–160 ký tự, mô tả tối đa 1000, hướng dẫn tối đa 4000 ký tự.';
  end if;
  selected_exam:=nullif(p_data->>'exam_id','')::uuid;
  if selected_exam is not null and not exists(select 1 from public.exams where id=selected_exam and status in ('Published','Internal')) then
    raise exception 'Chỉ được chọn đề đã xuất bản hoặc đề nội bộ.';
  end if;
  update public.campus_rooms set exam_title=heading,exam_description=description,exam_instructions=instructions,exam_id=selected_exam where id=p_room;
  return public.campus_snapshot();
end $$;
revoke all on function public.campus_exam_options(uuid,text),public.campus_exam_setup(uuid,jsonb) from public,anon;
grant execute on function public.campus_exam_options(uuid,text),public.campus_exam_setup(uuid,jsonb) to authenticated;
update public.campus_rooms set exam_title='Thi thử máy tính · Sản xuất chế tạo 2026',
  exam_description='Làm quen quy trình thi trên máy tính dành cho ngành sản xuất chế tạo.',
  exam_instructions=E'Ngồi đúng số máy được cấp.\nKiểm tra tai nghe trước khi bắt đầu.\nĐọc kỹ hướng dẫn trên màn hình chuẩn bị thi.'
where kind='exam' and title='Phòng thi thử · T201' and exam_title='';
commit;
