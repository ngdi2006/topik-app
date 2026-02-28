-- Tạo bảng lưu kết quả bài thi
CREATE TABLE IF NOT EXISTS public.exam_results (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    exam_id uuid REFERENCES public.exams(id) ON DELETE CASCADE,
    score numeric DEFAULT 0,
    total_correct integer DEFAULT 0,
    answers jsonb DEFAULT '{}'::jsonb,
    time_taken integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Bảo mật thông tin: Học viên chỉ được xem bài làm của chính mình
ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own exam results" 
ON public.exam_results FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own exam results" 
ON public.exam_results FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Admin và Teacher xem được mọi kết quả
CREATE POLICY "Admins and Teachers can view all results" 
ON public.exam_results FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'teacher')
  )
);
