-- Add tool_config JSONB column to interview_questions table
ALTER TABLE public.interview_questions ADD COLUMN IF NOT EXISTS tool_config jsonb DEFAULT NULL;

-- Add description comment for the column
COMMENT ON COLUMN public.interview_questions.tool_config IS 'Configurations for the 3-step tool usage interactive practice game.';
