-- ============================================================
-- EPS-TOPIK 2025: Schema cho hệ thống Bài học & Luyện giao tiếp AI
-- ============================================================

-- 1. Trigger function tự động cập nhật updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- BẢNG LESSONS: Lưu trữ thông tin bài học EPS-TOPIK 2025
-- ============================================================
CREATE TABLE IF NOT EXISTS public.lessons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lesson_number INTEGER UNIQUE NOT NULL,
    chapter INTEGER NOT NULL DEFAULT 1,
    title_korean TEXT NOT NULL,
    title_vietnamese TEXT NOT NULL,
    description TEXT,
    vocabulary JSONB DEFAULT '[]'::jsonb,
    grammar JSONB DEFAULT '[]'::jsonb,
    conversations JSONB DEFAULT '[]'::jsonb,
    culture JSONB DEFAULT '[]'::jsonb,
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_lessons_lesson_number ON public.lessons(lesson_number);
CREATE INDEX IF NOT EXISTS idx_lessons_chapter ON public.lessons(chapter);

CREATE TRIGGER set_lessons_updated_at
    BEFORE UPDATE ON public.lessons
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- RLS: Tất cả user đã đăng nhập đều đọc được bài học đã publish
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view published lessons"
ON public.lessons FOR SELECT
TO authenticated
USING (is_published = true);

CREATE POLICY "Admins can view all lessons"
ON public.lessons FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'teacher')
    )
);

CREATE POLICY "Admins can insert lessons"
ON public.lessons FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'teacher')
    )
);

CREATE POLICY "Admins can update lessons"
ON public.lessons FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'teacher')
    )
);

CREATE POLICY "Admins can delete lessons"
ON public.lessons FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'teacher')
    )
);

-- ============================================================
-- BẢNG USER_PROGRESS: Tiến độ học tập của từng học viên
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE NOT NULL,
    progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
    is_completed BOOLEAN DEFAULT false,
    completed_sections TEXT[] DEFAULT '{}',
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON public.user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_lesson_id ON public.user_progress(lesson_id);

CREATE TRIGGER set_user_progress_updated_at
    BEFORE UPDATE ON public.user_progress
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- RLS: Học viên chỉ xem/sửa tiến độ của chính mình
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own progress"
ON public.user_progress FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress"
ON public.user_progress FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress"
ON public.user_progress FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all progress"
ON public.user_progress FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'teacher')
    )
);

-- ============================================================
-- BẢNG AI_SPEAKING_SCENARIOS: Kịch bản hội thoại AI theo bài
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ai_speaking_scenarios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE NOT NULL,
    scenario_title TEXT NOT NULL,
    scenario_title_korean TEXT,
    context TEXT,
    system_prompt TEXT NOT NULL,
    sample_dialogue JSONB DEFAULT '[]'::jsonb,
    difficulty_level INTEGER DEFAULT 1 CHECK (difficulty_level >= 1 AND difficulty_level <= 5),
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_scenarios_lesson_id ON public.ai_speaking_scenarios(lesson_id);
CREATE INDEX IF NOT EXISTS idx_ai_scenarios_difficulty ON public.ai_speaking_scenarios(difficulty_level);

CREATE TRIGGER set_ai_scenarios_updated_at
    BEFORE UPDATE ON public.ai_speaking_scenarios
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- RLS: Tất cả user đọc được kịch bản đã publish, admin quản lý toàn bộ
ALTER TABLE public.ai_speaking_scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view published scenarios"
ON public.ai_speaking_scenarios FOR SELECT
TO authenticated
USING (is_published = true);

CREATE POLICY "Admins can view all scenarios"
ON public.ai_speaking_scenarios FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'teacher')
    )
);

CREATE POLICY "Admins can insert scenarios"
ON public.ai_speaking_scenarios FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'teacher')
    )
);

CREATE POLICY "Admins can update scenarios"
ON public.ai_speaking_scenarios FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'teacher')
    )
);

CREATE POLICY "Admins can delete scenarios"
ON public.ai_speaking_scenarios FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'teacher')
    )
);
