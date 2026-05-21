-- Migration: Add credits_required and free_attempts columns to exams table
-- is_free = TRUE  → đề luôn miễn phí (không giới hạn lượt)
-- is_free = FALSE → đề trả phí, có free_attempts lần miễn phí, sau đó tính credits_required/lần

-- Add columns
ALTER TABLE public.exams
ADD COLUMN IF NOT EXISTS credits_required INTEGER NOT NULL DEFAULT 1;

ALTER TABLE public.exams
ADD COLUMN IF NOT EXISTS free_attempts INTEGER NOT NULL DEFAULT 1;

-- Add check constraints
DO $$ BEGIN
    ALTER TABLE public.exams ADD CONSTRAINT exams_credits_required_positive CHECK (credits_required > 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE public.exams ADD CONSTRAINT exams_free_attempts_non_negative CHECK (free_attempts >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON COLUMN public.exams.credits_required IS 'Credits per attempt after free_attempts are exhausted';
COMMENT ON COLUMN public.exams.free_attempts IS 'Number of free attempts for paid exams (ignored when is_free=true)';

-- ============================================================
-- can_user_access_exam: check if user can take this exam
-- ============================================================
DROP FUNCTION IF EXISTS public.can_user_access_exam(UUID, UUID);

CREATE OR REPLACE FUNCTION public.can_user_access_exam(
    p_user_id UUID,
    p_exam_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_free BOOLEAN;
    v_credits_required INTEGER;
    v_free_attempts INTEGER;
    v_attempt_count INTEGER;
    v_remaining_credits INTEGER;
BEGIN
    SELECT is_free, credits_required, free_attempts
    INTO v_is_free, v_credits_required, v_free_attempts
    FROM exams WHERE id = p_exam_id;

    IF NOT FOUND THEN RETURN FALSE; END IF;

    -- Free exams: always accessible
    IF v_is_free THEN RETURN TRUE; END IF;

    -- Paid exam: count previous attempts
    SELECT COUNT(*) INTO v_attempt_count
    FROM exam_attempts
    WHERE user_id = p_user_id AND exam_id = p_exam_id;

    -- Still within free attempts
    IF v_attempt_count < v_free_attempts THEN RETURN TRUE; END IF;

    -- Free attempts exhausted: check credits
    SELECT COALESCE(remaining_credits, 0) INTO v_remaining_credits
    FROM user_exam_credits WHERE user_id = p_user_id;

    RETURN v_remaining_credits >= v_credits_required;
END;
$$;

-- ============================================================
-- consume_exam_credit: create attempt + deduct if needed
-- ============================================================
DROP FUNCTION IF EXISTS public.consume_exam_credit(UUID, UUID);

CREATE OR REPLACE FUNCTION public.consume_exam_credit(
    p_user_id UUID,
    p_exam_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_can_access BOOLEAN;
    v_is_free BOOLEAN;
    v_credits_required INTEGER;
    v_free_attempts INTEGER;
    v_attempt_count INTEGER;
    v_is_free_attempt BOOLEAN;
BEGIN
    SELECT can_user_access_exam(p_user_id, p_exam_id) INTO v_can_access;
    IF NOT v_can_access THEN RETURN FALSE; END IF;

    SELECT is_free, credits_required, free_attempts
    INTO v_is_free, v_credits_required, v_free_attempts
    FROM exams WHERE id = p_exam_id;

    -- Free exam: always free attempt
    IF v_is_free THEN
        v_is_free_attempt := TRUE;
    ELSE
        SELECT COUNT(*) INTO v_attempt_count
        FROM exam_attempts
        WHERE user_id = p_user_id AND exam_id = p_exam_id;

        v_is_free_attempt := v_attempt_count < v_free_attempts;
    END IF;

    INSERT INTO exam_attempts (user_id, exam_id, is_free_attempt, credits_used, started_at)
    VALUES (p_user_id, p_exam_id, v_is_free_attempt,
            CASE WHEN v_is_free_attempt THEN 0 ELSE v_credits_required END, NOW());

    IF NOT v_is_free_attempt THEN
        UPDATE user_exam_credits
        SET used_credits = used_credits + v_credits_required, updated_at = NOW()
        WHERE user_id = p_user_id;
    END IF;

    RETURN TRUE;
END;
$$;

-- ============================================================
-- get_random_free_exam: pick a random published free exam
-- ============================================================
DROP FUNCTION IF EXISTS public.get_random_free_exam();

CREATE OR REPLACE FUNCTION public.get_random_free_exam()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT id FROM exams
    WHERE is_free = TRUE AND status = 'Published'
    ORDER BY random()
    LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.can_user_access_exam(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_exam_credit(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_random_free_exam() TO authenticated;
