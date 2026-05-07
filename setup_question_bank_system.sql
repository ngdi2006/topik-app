-- =====================================================================
-- TOPIK-IBT: HỆ THỐNG QUẢN LÝ KHO CÂU HỎI & ĐỀ THI THÔNG MINH
-- Migration: Question Bank, Exam Rules, Random Non-Repeat, AI Analysis
-- =====================================================================

-- ============================================
-- 1. UPGRADE BẢNG EXAMS (mở rộng cấu hình)
-- ============================================
ALTER TABLE public.exams
  ADD COLUMN IF NOT EXISTS reading_duration INTEGER DEFAULT 40,
  ADD COLUMN IF NOT EXISTS listening_duration INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS exam_level INTEGER CHECK (exam_level BETWEEN 1 AND 6);

-- ============================================
-- 2. KHO CÂU HỎI (Question Bank)
-- ============================================
CREATE TABLE IF NOT EXISTS public.question_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Phân loại
  question_type TEXT NOT NULL CHECK (question_type IN ('reading', 'listening')),
  level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 6),
  
  -- Nội dung
  passage TEXT,
  question_text TEXT NOT NULL,
  question_image_url TEXT,
  audio_url TEXT,
  
  -- 4 đáp án cố định (JSONB array với 4 items)
  -- Format: [{"type":"text","content":"..."},{"type":"image","content":"url"}]
  options JSONB NOT NULL,
  correct_answer INTEGER NOT NULL CHECK (correct_answer BETWEEN 0 AND 3),
  shuffle_options BOOLEAN DEFAULT true,
  
  -- Điểm số (sẽ được override bởi rule.points_per_question nếu > 0)
  points NUMERIC DEFAULT 1 CHECK (points >= 0),
  
  -- Metadata
  tags TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qb_type_level ON public.question_bank(question_type, level);
CREATE INDEX IF NOT EXISTS idx_qb_tags ON public.question_bank USING GIN(tags);

-- ============================================
-- 3. RULES CẤU HÌNH ĐỀ
-- ============================================
CREATE TABLE IF NOT EXISTS public.exam_question_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  
  -- Filter
  question_type TEXT NOT NULL CHECK (question_type IN ('reading', 'listening')),
  levels INTEGER[] NOT NULL,
  tags TEXT[] DEFAULT '{}',
  
  -- Số câu cần lấy
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  
  -- Điểm/câu (>0 → override question.points; =0 → dùng question.points)
  points_per_question NUMERIC DEFAULT 0 CHECK (points_per_question >= 0),
  
  -- Hiển thị
  section_name TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_eqr_exam ON public.exam_question_rules(exam_id, order_index);

-- ============================================
-- 4. LỊCH SỬ CÂU HỎI ĐÃ THẤY (Anti-repeat)
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_question_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rule_id UUID NOT NULL REFERENCES public.exam_question_rules(id) ON DELETE CASCADE,
  question_bank_id UUID NOT NULL REFERENCES public.question_bank(id) ON DELETE CASCADE,
  
  cycle_number INTEGER DEFAULT 1,
  shown_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, rule_id, question_bank_id, cycle_number)
);

CREATE INDEX IF NOT EXISTS idx_uqh_user_rule ON public.user_question_history(user_id, rule_id, cycle_number);

-- ============================================
-- 5. PHIÊN THI (Snapshot câu hỏi đã random)
-- ============================================
CREATE TABLE IF NOT EXISTS public.exam_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  
  -- Snapshot câu hỏi (full data: id, text, options, correct_answer, points...)
  questions_snapshot JSONB NOT NULL,
  
  -- Đáp án người dùng: { "question_id": optionIndex }
  answers JSONB DEFAULT '{}'::jsonb,
  
  -- Kết quả
  score NUMERIC DEFAULT 0,
  total_points NUMERIC DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  wrong_count INTEGER DEFAULT 0,
  
  attempt_number INTEGER DEFAULT 1,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ea_user ON public.exam_attempts(user_id, exam_id);
CREATE INDEX IF NOT EXISTS idx_ea_status ON public.exam_attempts(status);

-- ============================================
-- 6. PHÂN TÍCH AI KẾT QUẢ THI
-- ============================================
CREATE TABLE IF NOT EXISTS public.exam_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.exam_attempts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Phân tích
  weak_areas JSONB DEFAULT '[]'::jsonb,
  strong_areas JSONB DEFAULT '[]'::jsonb,
  
  -- Gợi ý
  recommendations JSONB DEFAULT '[]'::jsonb,
  
  -- AI extract
  vocabulary_list JSONB DEFAULT '[]'::jsonb,
  grammar_points JSONB DEFAULT '[]'::jsonb,
  
  ai_summary TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ean_user ON public.exam_analysis(user_id);
CREATE INDEX IF NOT EXISTS idx_ean_attempt ON public.exam_analysis(attempt_id);

-- ============================================
-- 7. PRACTICE SESSIONS
-- ============================================
CREATE TABLE IF NOT EXISTS public.practice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis_id UUID REFERENCES public.exam_analysis(id) ON DELETE CASCADE,
  
  session_type TEXT NOT NULL CHECK (session_type IN ('retry', 'similar', 'vocabulary_quiz', 'grammar_quiz')),
  questions_snapshot JSONB NOT NULL,
  answers JSONB DEFAULT '{}'::jsonb,
  
  score NUMERIC DEFAULT 0,
  total_points NUMERIC DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  wrong_count INTEGER DEFAULT 0,
  
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ps_user ON public.practice_sessions(user_id, status);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- question_bank: Admin/Teacher full, Learner chỉ đọc qua API
ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin manage question bank" ON public.question_bank;
CREATE POLICY "Admin manage question bank" ON public.question_bank
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'teacher')
    )
  );

-- exam_question_rules: Admin only
ALTER TABLE public.exam_question_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin manage exam rules" ON public.exam_question_rules;
CREATE POLICY "Admin manage exam rules" ON public.exam_question_rules
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'teacher')
    )
  );

-- user_question_history: User chỉ xem của mình; Admin xem all
ALTER TABLE public.user_question_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "User view own history" ON public.user_question_history;
CREATE POLICY "User view own history" ON public.user_question_history
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'teacher')
  ));

DROP POLICY IF EXISTS "User insert own history" ON public.user_question_history;
CREATE POLICY "User insert own history" ON public.user_question_history
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- exam_attempts: User chỉ xem của mình
ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "User view own attempts" ON public.exam_attempts;
CREATE POLICY "User view own attempts" ON public.exam_attempts
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'teacher')
  ));

DROP POLICY IF EXISTS "User insert own attempts" ON public.exam_attempts;
CREATE POLICY "User insert own attempts" ON public.exam_attempts
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "User update own attempts" ON public.exam_attempts;
CREATE POLICY "User update own attempts" ON public.exam_attempts
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- exam_analysis: tương tự
ALTER TABLE public.exam_analysis ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "User view own analysis" ON public.exam_analysis;
CREATE POLICY "User view own analysis" ON public.exam_analysis
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'teacher')
  ));

DROP POLICY IF EXISTS "User insert own analysis" ON public.exam_analysis;
CREATE POLICY "User insert own analysis" ON public.exam_analysis
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- practice_sessions
ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "User manage own practice" ON public.practice_sessions;
CREATE POLICY "User manage own practice" ON public.practice_sessions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id);

-- ============================================
-- HELPER FUNCTION: AUTO update updated_at
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_qb_updated_at ON public.question_bank;
CREATE TRIGGER update_qb_updated_at
  BEFORE UPDATE ON public.question_bank
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- ============================================
-- STORAGE BUCKETS (chạy trong Supabase Studio)
-- ============================================
-- Tạo bucket 'question-media' (public read, authenticated write)
-- Có thể thực hiện qua Supabase Dashboard hoặc SQL:

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'question-media',
  'question-media',
  true,
  10485760, -- 10MB
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for question-media
DROP POLICY IF EXISTS "Public read question media" ON storage.objects;
CREATE POLICY "Public read question media" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'question-media');

DROP POLICY IF EXISTS "Auth upload question media" ON storage.objects;
CREATE POLICY "Auth upload question media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'question-media');

DROP POLICY IF EXISTS "Auth delete question media" ON storage.objects;
CREATE POLICY "Auth delete question media" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'question-media' AND
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'teacher'))
  );

-- =====================================================================
-- ✅ HOÀN TẤT MIGRATION
-- =====================================================================
