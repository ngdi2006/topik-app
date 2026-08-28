-- =====================================================================
-- Migration: Add order_index column to interview_questions table
-- Date: 2026-08-28
-- Description: Add order_index field to control interview question sorting
-- =====================================================================

-- Add order_index column with default value 0
ALTER TABLE public.interview_questions
ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

-- Add comment
COMMENT ON COLUMN public.interview_questions.order_index IS
'Thứ tự sắp xếp của câu hỏi. Số nhỏ hơn đứng trước.';

-- Create index for faster sorting
CREATE INDEX IF NOT EXISTS idx_interview_questions_order_index
ON public.interview_questions(order_index ASC, created_at ASC);

-- Update existing questions to have sequential order_index based on created_at ASC
WITH numbered_questions AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as seq_num
    FROM public.interview_questions
)
UPDATE public.interview_questions q
SET order_index = nq.seq_num
FROM numbered_questions nq
WHERE q.id = nq.id AND (q.order_index IS NULL OR q.order_index = 0);
