-- =====================================================================
-- TOPIK-IBT: Question Categories (Kho câu hỏi)
-- Migration: Thêm hệ thống phân loại theo kho
-- =====================================================================

-- 1. Tạo bảng question_categories (Kho)
CREATE TABLE IF NOT EXISTS question_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT '📚',
    color TEXT DEFAULT '#3B82F6',
    parent_id UUID REFERENCES question_categories(id) ON DELETE SET NULL,
    question_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Thêm category_id vào question_bank
ALTER TABLE question_bank 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES question_categories(id) ON DELETE SET NULL;

-- 3. Thêm category_id vào exam_question_rules
ALTER TABLE exam_question_rules 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES question_categories(id) ON DELETE SET NULL;

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_question_bank_category ON question_bank(category_id);
CREATE INDEX IF NOT EXISTS idx_exam_rules_category ON exam_question_rules(category_id);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON question_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_active ON question_categories(is_active);

-- 5. Function: Auto update question_count
CREATE OR REPLACE FUNCTION update_category_question_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE question_categories 
        SET question_count = question_count + 1,
            updated_at = NOW()
        WHERE id = NEW.category_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE question_categories 
        SET question_count = GREATEST(question_count - 1, 0),
            updated_at = NOW()
        WHERE id = OLD.category_id;
    ELSIF TG_OP = 'UPDATE' AND OLD.category_id IS DISTINCT FROM NEW.category_id THEN
        -- Giảm count ở kho cũ
        UPDATE question_categories 
        SET question_count = GREATEST(question_count - 1, 0),
            updated_at = NOW()
        WHERE id = OLD.category_id;
        -- Tăng count ở kho mới
        UPDATE question_categories 
        SET question_count = question_count + 1,
            updated_at = NOW()
        WHERE id = NEW.category_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger
DROP TRIGGER IF EXISTS trigger_update_category_count ON question_bank;
CREATE TRIGGER trigger_update_category_count
AFTER INSERT OR UPDATE OR DELETE ON question_bank
FOR EACH ROW
EXECUTE FUNCTION update_category_question_count();

-- 7. RLS Policies cho question_categories
ALTER TABLE question_categories ENABLE ROW LEVEL SECURITY;

-- Admin có thể làm tất cả
CREATE POLICY "Admin full access to categories"
ON question_categories
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- Learner chỉ xem được kho active
CREATE POLICY "Learners can view active categories"
ON question_categories
FOR SELECT
TO authenticated
USING (is_active = true);

-- 8. Insert default categories (Kho mẫu)
INSERT INTO question_categories (name, description, icon, color) VALUES
('Từ vựng cơ bản', 'Từ vựng thông dụng hàng ngày', '📚', '#3B82F6'),
('Ngữ pháp TOPIK 1', 'Ngữ pháp cơ bản cho TOPIK cấp độ 1', '📝', '#10B981'),
('Ngữ pháp TOPIK 2', 'Ngữ pháp trung cấp cho TOPIK cấp độ 2', '📝', '#F59E0B'),
('Văn hóa Hàn Quốc', 'Câu hỏi về văn hóa, phong tục Hàn Quốc', '🎎', '#EF4444'),
('Hội thoại hàng ngày', 'Giao tiếp trong cuộc sống thường ngày', '💬', '#8B5CF6'),
('Đọc hiểu trung cấp', 'Bài đọc hiểu cấp độ trung bình', '📖', '#EC4899'),
('Nghe hiểu nâng cao', 'Bài nghe hiểu cấp độ cao', '🎧', '#06B6D4')
ON CONFLICT DO NOTHING;

-- 9. Function: Get category stats
CREATE OR REPLACE FUNCTION get_category_stats(cat_id UUID)
RETURNS TABLE (
    total_questions INTEGER,
    by_level JSONB,
    by_type JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_questions,
        jsonb_object_agg(level, count) as by_level,
        jsonb_object_agg(question_type, count) as by_type
    FROM (
        SELECT 
            level,
            question_type,
            COUNT(*) as count
        FROM question_bank
        WHERE category_id = cat_id
        GROUP BY level, question_type
    ) stats;
END;
$$ LANGUAGE plpgsql;

-- 10. View: Category với stats
CREATE OR REPLACE VIEW category_stats AS
SELECT 
    c.*,
    COUNT(q.id) as actual_question_count,
    COUNT(DISTINCT q.level) as level_count,
    jsonb_agg(DISTINCT q.question_type) FILTER (WHERE q.question_type IS NOT NULL) as question_types
FROM question_categories c
LEFT JOIN question_bank q ON q.category_id = c.id
GROUP BY c.id;

COMMENT ON TABLE question_categories IS 'Kho câu hỏi - Phân loại câu hỏi theo chủ đề/kho';
COMMENT ON COLUMN question_categories.parent_id IS 'Hỗ trợ kho con (hierarchical)';
COMMENT ON COLUMN question_categories.question_count IS 'Cache số câu trong kho (auto update)';
