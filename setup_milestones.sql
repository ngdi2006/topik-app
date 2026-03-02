-- SQL Script: Tạo bảng Quản lý Mốc Đánh Giá Năng Lực (milestones)

-- 1. Xóa bảng nếu đã tồn tại (để reset an toàn nếu cần)
-- DROP TABLE IF EXISTS public.milestones;

-- 2. Tạo bảng milestones
CREATE TABLE IF NOT EXISTS public.milestones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    level TEXT UNIQUE NOT NULL, -- Mã cấp độ (VD: '1', '2', '3', '4', '5'...)
    title TEXT NOT NULL,
    description TEXT,
    reading_text TEXT,
    qa_text TEXT,
    has_personal_form BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Kích hoạt Row Level Security (RLS) để bảo mật
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;

-- 4. Phân Quyền: Ai cũng được Phân tích và Đọc danh sách Mốc (Select)
CREATE POLICY "Enable read access for all users" ON public.milestones
    FOR SELECT USING (true);

-- Lưu ý: Quyền Insert/Update/Delete sẽ được thực thi qua Server Side 
-- với SUPABASE_SERVICE_ROLE_KEY nên không cần định nghĩa Policy ở đây cho client.

-- 5. Nạp trước 4 Mốc Dữ Liệu Gốc (Di dời từ Code nguyên thủy)
INSERT INTO public.milestones (level, title, description, reading_text, qa_text, has_personal_form)
VALUES 
    ('1', 'Mốc 1: Nhập môn', 'Kiểm tra phát âm cơ bản và phản xạ chào hỏi.', '안녕하세요. 만나서 반갑습니다. 제 이름은 톰입니다.', '이름이 뭡니까? 어느 나라 사람입니까?', false),
    ('2', 'Mốc 2: Sau Bài 8', 'Đoạn văn ngắn (Biến âm, Nối âm) và vấn đáp thường ngày.', '저는 학생입니다. 매일 아침 7시에 일어납니다. 학교에서 한국어를 공부합니다. 주말에는 친구를 만나고 영화를 봅니다.', '주말에 보통 뭐 해요? 어제 뭘 했어요?', false),
    ('3', 'Mốc 3: Sau Bài 20', 'Tích hợp AI tạo Form Giới thiệu bản thân chi tiết.', 'Vui lòng điền thông tin cá nhân ở trên để AI biên soạn bài giới thiệu mẫu dành riêng cho bạn trước khi làm Bài Test Đọc.', '취미가 뭐예요? 왜 그 취미를 좋아해요?', true),
    ('4', 'Mốc 4: Sau Bài 30', 'Đoạn văn dài phức tạp (Trung cấp) và phản xạ giao tiếp mở rộng.', '최근 환경 문제가 심각해지고 있습니다. 우리는 일회용품 사용을 줄이고 재활용을 실천해야 합니다. 작은 노력이 큰 변화를 만듭니다.', '한국 문화를 좋아하게 된 계기가 무엇인가요?', false)
ON CONFLICT (level) DO NOTHING;

-- Báo hiệu tạo xong --
