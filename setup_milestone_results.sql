-- SQL Script: Tạo bảng lưu Kết Quả Thi Mốc (Milestone Results)
CREATE TABLE IF NOT EXISTS public.milestone_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    milestone_id UUID REFERENCES public.milestones(id) ON DELETE CASCADE NOT NULL,
    reading_score NUMERIC DEFAULT 0,
    qa_score NUMERIC DEFAULT 0,
    total_score NUMERIC DEFAULT 0,
    reading_report JSONB,
    qa_reports JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS (Row Level Security)
ALTER TABLE public.milestone_results ENABLE ROW LEVEL SECURITY;

-- Policy cho phép User đọc dữ liệu của chính mình
CREATE POLICY "Enable read access for user own records" ON public.milestone_results
    FOR SELECT USING (auth.uid() = user_id);

-- Policy cho phép User chèn dữ liệu của chính mình
CREATE POLICY "Enable insert access for user own records" ON public.milestone_results
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy cho phép Admin đọc toàn bộ
CREATE POLICY "Enable read access for admins" ON public.milestone_results
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'teacher')
        )
    );
