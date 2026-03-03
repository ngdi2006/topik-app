-- Kịch bản SQL (Chạy trên Supabase SQL Editor)
-- Bổ sung các cột thông số thiết lập Bài Thi Kiểm Tra (Chế độ Test)
ALTER TABLE public.milestones ADD COLUMN IF NOT EXISTS reading_points INTEGER DEFAULT 20;
ALTER TABLE public.milestones ADD COLUMN IF NOT EXISTS reading_time_limit INTEGER DEFAULT 120;

-- (Chú ý: Các thông số thời gian và điểm của bài Vấn Đáp QA được lưu trực tiếp bằng Cấu trúc JSON Object bên trong cột qa_text hiện tại, nên không cần rách thêm cột).
