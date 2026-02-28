-- CHẠY SCRIPT NÀY TRONG SUPABASE SQL EDITOR ĐỂ TẠO BẢNG CHAT_EVALUATIONS QUA 1 CÚ CLICK:

CREATE TABLE public.chat_evaluations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    scenario TEXT NOT NULL,
    score INTEGER NOT NULL,
    strengths TEXT[],
    weaknesses TEXT[],
    advice TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.chat_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own evaluations"
ON public.chat_evaluations FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own evaluations"
ON public.chat_evaluations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all evaluations"
ON public.chat_evaluations FOR SELECT
USING (auth.jwt()->>'role' = 'admin');

-- Thông báo chạy xong báo Success.
