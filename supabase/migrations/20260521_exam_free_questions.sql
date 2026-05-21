-- Create table for fixed questions in free exam attempts
CREATE TABLE IF NOT EXISTS exam_free_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    question_bank_id UUID NOT NULL REFERENCES question_bank(id) ON DELETE CASCADE,
    question_type VARCHAR(20) NOT NULL CHECK (question_type IN ('reading', 'listening')),
    order_index INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(exam_id, question_bank_id)
);

-- Create index for faster lookups
CREATE INDEX idx_exam_free_questions_exam_id ON exam_free_questions(exam_id);
CREATE INDEX idx_exam_free_questions_type ON exam_free_questions(exam_id, question_type);

-- Enable RLS
ALTER TABLE exam_free_questions ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read (needed for exam start)
CREATE POLICY "Anyone can read exam_free_questions"
    ON exam_free_questions FOR SELECT
    USING (true);

-- Policy: Only admins can insert/update/delete
CREATE POLICY "Only admins can modify exam_free_questions"
    ON exam_free_questions FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );
