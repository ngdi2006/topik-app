-- Add description_vi field to vocabulary_vong2 for sign explanations
ALTER TABLE public.vocabulary_vong2 
ADD COLUMN IF NOT EXISTS description_vi TEXT;

-- description_vi is mainly used for SIGN type to explain what the sign means/instructs
-- For TOOL type: leave null (not needed)
-- For COMMAND type: can optionally store context/usage
-- For SIGN type: store what action/rule the sign indicates (e.g., "Bắt buộc mặc áo phản quang khi làm việc")

COMMENT ON COLUMN public.vocabulary_vong2.description_vi IS 
'Vietnamese explanation/description. For SIGN: what the sign means or instructs. For TOOL: optional usage context.';
