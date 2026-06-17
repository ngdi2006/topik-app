-- Tạo bảng exam_assignments
CREATE TABLE IF NOT EXISTS public.exam_assignments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    exam_id uuid REFERENCES public.exams(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    UNIQUE(exam_id, user_id)
);

-- Bảo mật thông tin cơ bản: Admin có toàn quyền (vì dùng Service Role Key), còn user không cần trực tiếp query bảng này từ client do đã bọc qua API route.
