-- ============================================================
-- COMBINED MIGRATION: Run this in Supabase SQL Editor
-- Combines: 20260520_exam_payment_system + 20260521_exam_credits_required
-- Safe to run multiple times (uses IF NOT EXISTS, CREATE OR REPLACE, etc.)
-- ============================================================

-- ============================================================
-- PART 1: Tables
-- ============================================================

-- 1. Payment Packages Table
CREATE TABLE IF NOT EXISTS payment_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_name VARCHAR(100) NOT NULL,
    credits INT NOT NULL CHECK (credits > 0),
    price_vnd INT NOT NULL CHECK (price_vnd >= 0),
    is_active BOOLEAN DEFAULT true,
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. User Exam Credits Table
CREATE TABLE IF NOT EXISTS user_exam_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    total_credits INT DEFAULT 0 CHECK (total_credits >= 0),
    used_credits INT DEFAULT 0 CHECK (used_credits >= 0),
    remaining_credits INT GENERATED ALWAYS AS (total_credits - used_credits) STORED,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 3. Payment Transactions Table
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    package_id UUID REFERENCES payment_packages(id) ON DELETE SET NULL,
    transaction_code VARCHAR(100) UNIQUE NOT NULL,
    amount_vnd INT NOT NULL,
    credits_purchased INT NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'bank_transfer',
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'expired')),
    qr_code_url TEXT,
    payment_proof_url TEXT,
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES auth.users(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Exam Attempts History Table
CREATE TABLE IF NOT EXISTS exam_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    is_free_attempt BOOLEAN DEFAULT false,
    credits_used INT DEFAULT 1,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    score DECIMAL(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PART 2: Add columns to exams table
-- ============================================================

ALTER TABLE exams ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT false;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS credits_required INTEGER NOT NULL DEFAULT 1;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS free_attempts INTEGER NOT NULL DEFAULT 1;

-- Add check constraints (safe if already exists)
DO $$ BEGIN
    ALTER TABLE public.exams ADD CONSTRAINT exams_credits_required_positive CHECK (credits_required > 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE public.exams ADD CONSTRAINT exams_free_attempts_non_negative CHECK (free_attempts >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON COLUMN public.exams.is_free IS 'If true, exam is always free with unlimited attempts';
COMMENT ON COLUMN public.exams.credits_required IS 'Credits per attempt after free_attempts are exhausted';
COMMENT ON COLUMN public.exams.free_attempts IS 'Number of free attempts for paid exams (ignored when is_free=true)';

-- ============================================================
-- PART 3: Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_user_exam_credits_user_id ON user_exam_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(payment_status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_code ON payment_transactions(transaction_code);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_user_exam ON exam_attempts(user_id, exam_id);
CREATE INDEX IF NOT EXISTS idx_exams_is_free ON exams(is_free);

-- ============================================================
-- PART 4: Triggers
-- ============================================================

CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
    CREATE TRIGGER payment_packages_updated_at BEFORE UPDATE ON payment_packages
        FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TRIGGER user_exam_credits_updated_at BEFORE UPDATE ON user_exam_credits
        FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TRIGGER payment_transactions_updated_at BEFORE UPDATE ON payment_transactions
        FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- PART 5: RLS Policies (safe with IF NOT EXISTS pattern)
-- ============================================================

ALTER TABLE payment_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_exam_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_attempts ENABLE ROW LEVEL SECURITY;

-- payment_packages policies
DO $$ BEGIN
    CREATE POLICY "Anyone can view active packages" ON payment_packages FOR SELECT USING (is_active = true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "Admin can manage packages" ON payment_packages FOR ALL
    USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'teacher')));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- user_exam_credits policies
DO $$ BEGIN
    CREATE POLICY "Users can view own credits" ON user_exam_credits FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can insert own credits" ON user_exam_credits FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can update own credits" ON user_exam_credits FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "Admin can view all credits" ON user_exam_credits FOR SELECT
    USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'teacher')));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- payment_transactions policies
DO $$ BEGIN
    CREATE POLICY "Users can view own transactions" ON payment_transactions FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can create own transactions" ON payment_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "Admin can view all transactions" ON payment_transactions FOR SELECT
    USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'teacher')));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "Admin can update transactions" ON payment_transactions FOR UPDATE
    USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'teacher')));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- exam_attempts policies
DO $$ BEGIN
    CREATE POLICY "Users can view own attempts" ON exam_attempts FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can create own attempts" ON exam_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "Admin can view all attempts" ON exam_attempts FOR SELECT
    USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'teacher')));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- PART 6: Default payment packages
-- ============================================================

INSERT INTO payment_packages (package_name, credits, price_vnd, display_order, is_active) VALUES
    ('Goi 10 luot', 10, 99000, 1, true),
    ('Goi 20 luot', 20, 189000, 2, true),
    ('Goi 50 luot', 50, 399000, 3, true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- PART 7: Functions (latest version with free_attempts support)
-- ============================================================

-- Drop old versions first
DROP FUNCTION IF EXISTS public.can_user_access_exam(UUID, UUID);
DROP FUNCTION IF EXISTS public.consume_exam_credit(UUID, UUID);
DROP FUNCTION IF EXISTS public.get_random_free_exam();
DROP FUNCTION IF EXISTS public.increment_user_credits(UUID, INT);

-- can_user_access_exam: check if user can take this exam
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

-- consume_exam_credit: create attempt + deduct if needed
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

-- get_random_free_exam: pick a random published free exam
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

-- increment_user_credits: used by admin when approving payment
CREATE OR REPLACE FUNCTION public.increment_user_credits(p_user_id UUID, p_credits INT)
RETURNS VOID AS $$
BEGIN
    INSERT INTO user_exam_credits (user_id, total_credits, used_credits)
    VALUES (p_user_id, p_credits, 0)
    ON CONFLICT (user_id)
    DO UPDATE SET total_credits = user_exam_credits.total_credits + p_credits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- PART 8: Grant permissions
-- ============================================================

GRANT EXECUTE ON FUNCTION public.can_user_access_exam(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_exam_credit(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_random_free_exam() TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_user_credits(UUID, INT) TO authenticated;
