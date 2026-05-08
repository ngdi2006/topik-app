-- =====================================================================
-- TOPIK-IBT: Categories V2 - Sort Order & Shuffle Options
-- Migration: Thêm STT sắp xếp và toggle đảo đáp án
-- =====================================================================

-- 1. Thêm columns mới
ALTER TABLE question_categories 
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS shuffle_options BOOLEAN DEFAULT true;

-- 2. Index cho sort
CREATE INDEX IF NOT EXISTS idx_categories_sort 
ON question_categories(sort_order);

-- 3. Update existing records với sort_order tự động (theo thứ tự created_at)
WITH numbered_categories AS (
    SELECT 
        id,
        ROW_NUMBER() OVER (ORDER BY created_at) as row_num
    FROM question_categories
    WHERE sort_order = 0
)
UPDATE question_categories
SET sort_order = numbered_categories.row_num
FROM numbered_categories
WHERE question_categories.id = numbered_categories.id;

-- 4. Comments
COMMENT ON COLUMN question_categories.sort_order IS 'STT sắp xếp hiển thị (0, 1, 2, ...)';
COMMENT ON COLUMN question_categories.shuffle_options IS 'Đảo đáp án khi làm bài (true = đảo, false = giữ nguyên)';

-- 5. Verify
SELECT 
    id, 
    name, 
    sort_order, 
    shuffle_options,
    question_count
FROM question_categories
ORDER BY sort_order;
