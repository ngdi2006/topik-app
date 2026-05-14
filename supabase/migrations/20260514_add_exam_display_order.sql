-- =====================================================================
-- Migration: Add display_order column to exams table
-- Date: 2026-05-14
-- Description: Add display_order field to control exam sorting in learner dashboard
-- =====================================================================

-- Add display_order column with default value 0
ALTER TABLE public.exams
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0 NOT NULL;

-- Add comment
COMMENT ON COLUMN public.exams.display_order IS
'Display order for sorting exams in learner dashboard. Lower numbers appear first. 0 = default (sort by created_at)';

-- Create index for faster sorting
CREATE INDEX IF NOT EXISTS idx_exams_display_order ON public.exams(display_order, created_at DESC);

-- Update existing exams to have sequential display_order based on created_at
-- Newest exams get lower numbers (appear first)
WITH ranked_exams AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC) as rn
    FROM public.exams
)
UPDATE public.exams
SET display_order = ranked_exams.rn
FROM ranked_exams
WHERE exams.id = ranked_exams.id;
