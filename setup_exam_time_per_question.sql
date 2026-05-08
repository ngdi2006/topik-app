-- =====================================================================
-- TOPIK-IBT: Exam Time Per Question for Listening
-- Migration: Thêm time_per_question cho listening rules
-- =====================================================================

-- 1. Thêm column time_per_question
ALTER TABLE exam_question_rules 
ADD COLUMN IF NOT EXISTS time_per_question INTEGER DEFAULT 15;

-- 2. Comment
COMMENT ON COLUMN exam_question_rules.time_per_question IS 'Thời gian đếm ngược sau audio (giây) - chỉ áp dụng cho listening';

-- 3. Update existing listening rules với default 15s
UPDATE exam_question_rules
SET time_per_question = 15
WHERE question_type = 'listening' AND time_per_question IS NULL;

-- 4. Verify
SELECT 
    id,
    exam_id,
    question_type,
    quantity,
    time_per_question,
    section_name
FROM exam_question_rules
ORDER BY exam_id, order_index;
