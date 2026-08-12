-- P8 schema. The enum value must be committed before it is used by the seed migration.
ALTER TYPE public.interview_category ADD VALUE IF NOT EXISTS 'An toàn lao động';

ALTER TABLE public.interview_questions
    ADD COLUMN IF NOT EXISTS safety_group text,
    ADD COLUMN IF NOT EXISTS safety_topic_number integer,
    ADD COLUMN IF NOT EXISTS safety_topic_ko text,
    ADD COLUMN IF NOT EXISTS safety_topic_vi text;

COMMENT ON COLUMN public.interview_questions.safety_group IS
    'P8 phase: before_work | during_work | after_work | incident_response';
