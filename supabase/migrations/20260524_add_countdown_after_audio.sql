-- Thêm cột countdown_after_audio vào bảng question_bank
-- Sử dụng để lưu thời gian đếm ngược (giây) sau khi audio phát xong, dành riêng cho câu hỏi phần Free Nghe Hiểu

ALTER TABLE question_bank 
ADD COLUMN IF NOT EXISTS countdown_after_audio INTEGER DEFAULT 5;
