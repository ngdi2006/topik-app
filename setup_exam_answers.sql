-- =====================================================================
-- Setup: exam_answers table for storing section-based answers
-- =====================================================================
-- This table stores answers for reading and listening sections separately
-- Allows saving answers incrementally as user completes each section

-- Create exam_answers table
CREATE TABLE IF NOT EXISTS public.exam_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID NOT NULL REFERENCES public.exam_attempts(id) ON DELETE CASCADE,
    question_id UUID NOT NULL,
    selected_option INTEGER, -- 0-3 for option index, NULL if not answered
    section TEXT, -- 'reading' or 'listening'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_exam_answers_attempt_id ON public.exam_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_exam_answers_question_id ON public.exam_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_exam_answers_section ON public.exam_answers(section);

-- Composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_exam_answers_attempt_section ON public.exam_answers(attempt_id, section);

-- Enable RLS
ALTER TABLE public.exam_answers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can read own answers" ON public.exam_answers;
DROP POLICY IF EXISTS "Users can insert own answers" ON public.exam_answers;
DROP POLICY IF EXISTS "Users can update own answers" ON public.exam_answers;
DROP POLICY IF EXISTS "Users can delete own answers" ON public.exam_answers;

-- RLS Policies
-- Users can only read their own answers
CREATE POLICY "Users can read own answers"
    ON public.exam_answers
    FOR SELECT
    USING (
        attempt_id IN (
            SELECT id FROM public.exam_attempts WHERE user_id = auth.uid()
        )
    );

-- Users can insert their own answers
CREATE POLICY "Users can insert own answers"
    ON public.exam_answers
    FOR INSERT
    WITH CHECK (
        attempt_id IN (
            SELECT id FROM public.exam_attempts WHERE user_id = auth.uid()
        )
    );

-- Users can update their own answers (for re-save)
CREATE POLICY "Users can update own answers"
    ON public.exam_answers
    FOR UPDATE
    USING (
        attempt_id IN (
            SELECT id FROM public.exam_attempts WHERE user_id = auth.uid()
        )
    );

-- Users can delete their own answers
CREATE POLICY "Users can delete own answers"
    ON public.exam_answers
    FOR DELETE
    USING (
        attempt_id IN (
            SELECT id FROM public.exam_attempts WHERE user_id = auth.uid()
        )
    );

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_exam_answers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_exam_answers_updated_at_trigger ON public.exam_answers;

CREATE TRIGGER update_exam_answers_updated_at_trigger
    BEFORE UPDATE ON public.exam_answers
    FOR EACH ROW
    EXECUTE FUNCTION update_exam_answers_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_answers TO authenticated;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Table exam_answers created successfully!';
    RAISE NOTICE 'Please refresh your Supabase schema cache.';
END $$;
