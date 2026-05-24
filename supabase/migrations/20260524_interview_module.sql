-- Create Enum for interview question categories
DO $$ BEGIN
    CREATE TYPE interview_category AS ENUM ('Khẩu lệnh', 'Giao tiếp', 'Toán học', 'Sử dụng công cụ', 'Xử lý tình huống');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create interview_questions table
CREATE TABLE IF NOT EXISTS interview_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category interview_category NOT NULL,
    question_text TEXT NOT NULL,
    vietnamese_meaning TEXT,
    question_audio_url TEXT,
    suggested_answers JSONB, -- Array of strings
    countdown_after_audio INTEGER,
    tool_image_url TEXT,
    target_zone_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE interview_questions ENABLE ROW LEVEL SECURITY;

-- Create policies for interview_questions
CREATE POLICY "Allow public read access on interview_questions"
    ON interview_questions FOR SELECT
    USING (true);

CREATE POLICY "Allow admin all access on interview_questions"
    ON interview_questions FOR ALL
    USING (auth.role() = 'authenticated'); -- or specific admin logic if needed

-- Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    ai_global_prompt TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for system_settings
CREATE POLICY "Allow public read access on system_settings"
    ON system_settings FOR SELECT
    USING (true);

CREATE POLICY "Allow admin all access on system_settings"
    ON system_settings FOR ALL
    USING (auth.role() = 'authenticated');

-- Insert initial row if not exists
INSERT INTO system_settings (id, ai_global_prompt) 
VALUES (1, 'Bạn là một giám khảo chấm thi phỏng vấn tiếng Hàn. Vui lòng dựa vào tiêu chí sau để chấm điểm...') 
ON CONFLICT (id) DO NOTHING;
