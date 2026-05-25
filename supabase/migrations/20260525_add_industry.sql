-- Thêm cột industry vào bảng interview_questions
ALTER TABLE interview_questions ADD COLUMN IF NOT EXISTS industry TEXT DEFAULT 'Sản xuất chế tạo';

-- Thêm cột industry_prompts vào system_settings để lưu cấu hình Prompt riêng biệt theo ngành
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS industry_prompts JSONB DEFAULT '{
  "Sản xuất chế tạo": "Bạn là giám khảo chấm thi tiếng Hàn chuyên ngành Sản xuất chế tạo...",
  "Ngư nghiệp": "Bạn là giám khảo chấm thi tiếng Hàn chuyên ngành Ngư nghiệp...",
  "Nông nghiệp": "Bạn là giám khảo chấm thi tiếng Hàn chuyên ngành Nông nghiệp...",
  "Lâm nghiệp": "Bạn là giám khảo chấm thi tiếng Hàn chuyên ngành Lâm nghiệp...",
  "Xây dựng": "Bạn là giám khảo chấm thi tiếng Hàn chuyên ngành Xây dựng...",
  "Dịch vụ": "Bạn là giám khảo chấm thi tiếng Hàn chuyên ngành Dịch vụ..."
}'::jsonb;
