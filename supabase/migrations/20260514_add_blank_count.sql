-- =====================================================================
-- Migration: Add blank_count column to exam_attempts table
-- Date: 2026-05-14
-- Description: Track blank/unanswered questions separately from wrong answers
-- =====================================================================

-- Add blank_count column with default value 0
ALTER TABLE public.exam_attempts
ADD COLUMN IF NOT EXISTS blank_count INTEGER DEFAULT 0 NOT NULL;

-- Add comment
COMMENT ON COLUMN public.exam_attempts.blank_count IS
'Number of questions left blank (not answered) by the user';

-- Update existing records to calculate blank_count from questions_snapshot
-- For existing attempts, blank_count = total_questions - correct_count - wrong_count
UPDATE public.exam_attempts
SET blank_count = (
    CASE
        WHEN questions_snapshot IS NOT NULL
        THEN jsonb_array_length(questions_snapshot) - COALESCE(correct_count, 0) - COALESCE(wrong_count, 0)
        ELSE 0
    END
)
WHERE blank_count = 0 AND status = 'completed';
