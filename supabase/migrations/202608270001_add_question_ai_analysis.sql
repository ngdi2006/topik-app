-- Lưu phân tích chi tiết theo từng câu để dùng cho luyện lại và luyện theo dạng.
ALTER TABLE public.question_bank
    ADD COLUMN IF NOT EXISTS ai_question_analysis JSONB,
    ADD COLUMN IF NOT EXISTS ai_analysis_version INTEGER,
    ADD COLUMN IF NOT EXISTS ai_analyzed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.question_bank.ai_question_analysis IS
    'Phân loại dạng câu, manh mối, giải thích đáp án, chiến lược và lỗi thường gặp do AI tạo.';

CREATE INDEX IF NOT EXISTS idx_question_bank_ai_analysis_pending
    ON public.question_bank (category_id)
    WHERE ai_question_analysis IS NULL;
