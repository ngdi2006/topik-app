-- =====================================================================
-- TOPIK-IBT: Flexible Options & Question Position
-- Migration: Support 2-4 options and question positioning
-- =====================================================================

-- 1. Add question_position field
ALTER TABLE public.question_bank
ADD COLUMN IF NOT EXISTS question_position TEXT DEFAULT 'below'
CHECK (question_position IN ('above', 'below'));

-- 2. Update comments for documentation
COMMENT ON COLUMN public.question_bank.options IS
'JSONB array of 2-4 options: [{"type":"text|image","content":"..."}]. Supports HTML formatting (sanitized).';

COMMENT ON COLUMN public.question_bank.question_position IS
'Display position: "above" = question before passage, "below" = question after passage (default)';

-- 3. Set default for existing questions
UPDATE public.question_bank
SET question_position = 'below'
WHERE question_position IS NULL;
