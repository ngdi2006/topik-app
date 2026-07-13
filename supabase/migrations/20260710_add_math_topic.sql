-- Add math_topic column to interview_questions for sub-categorizing math questions
ALTER TABLE interview_questions ADD COLUMN IF NOT EXISTS math_topic TEXT;

-- Comment for documentation
COMMENT ON COLUMN interview_questions.math_topic IS 'Sub-topic for math questions: arithmetic | length | weight | time';
