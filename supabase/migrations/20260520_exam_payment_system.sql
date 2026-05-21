-- Migration: Exam Payment System
-- Created: 2026-05-20
-- Purpose: Add payment system for exam attempts with credit-based access

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

-- 5. Add is_free column to exams table
ALTER TABLE exams ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT false;

-- 6. Create indexes
CREATE INDEX IF NOT EXISTS idx_user_exam_credits_user_id ON user_exam_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(payment_status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_code ON payment_transactions(transaction_code);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_user_exam ON exam_attempts(user_id, exam_id);
CREATE INDEX IF NOT EXISTS idx_exams_is_free ON exams(is_free);

-- 7. Triggers for updated_at
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_packages_updated_at BEFORE UPDATE ON payment_packages
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER user_exam_credits_updated_at BEFORE UPDATE ON user_exam_credits
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER payment_transactions_updated_at BEFORE UPDATE ON payment_transactions
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- 8. RLS Policies

-- payment_packages: public read, admin write
ALTER TABLE payment_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active packages"
    ON payment_packages FOR SELECT
    USING (is_active = true);

CREATE POLICY "Admin can manage packages"
    ON payment_packages FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'teacher')
        )
    );

-- user_exam_credits: users see own, admin see all
ALTER TABLE user_exam_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credits"
    ON user_exam_credits FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own credits"
    ON user_exam_credits FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own credits"
    ON user_exam_credits FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Admin can view all credits"
    ON user_exam_credits FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'teacher')
        )
    );

-- payment_transactions: users see own, admin see all
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
    ON payment_transactions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own transactions"
    ON payment_transactions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin can view all transactions"
    ON payment_transactions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'teacher')
        )
    );

CREATE POLICY "Admin can update transactions"
    ON payment_transactions FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'teacher')
        )
    );

-- exam_attempts: users see own, admin see all
ALTER TABLE exam_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own attempts"
    ON exam_attempts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own attempts"
    ON exam_attempts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin can view all attempts"
    ON exam_attempts FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'teacher')
        )
    );

-- 9. Insert default payment packages
INSERT INTO payment_packages (package_name, credits, price_vnd, display_order, is_active) VALUES
    ('Gói 10 lượt', 10, 99000, 1, true),
    ('Gói 20 lượt', 20, 189000, 2, true),
    ('Gói 50 lượt', 50, 399000, 3, true)
ON CONFLICT DO NOTHING;

-- 10. Function to check if user can access exam
CREATE OR REPLACE FUNCTION can_user_access_exam(p_user_id UUID, p_exam_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_is_free BOOLEAN;
    v_remaining_credits INT;
    v_has_attempted BOOLEAN;
BEGIN
    -- Check if exam is free
    SELECT is_free INTO v_is_free FROM exams WHERE id = p_exam_id;

    IF v_is_free THEN
        -- Check if user has already attempted this free exam
        SELECT EXISTS(
            SELECT 1 FROM exam_attempts
            WHERE user_id = p_user_id
            AND exam_id = p_exam_id
            AND is_free_attempt = true
        ) INTO v_has_attempted;

        RETURN NOT v_has_attempted;
    END IF;

    -- Check if user has credits
    SELECT COALESCE(remaining_credits, 0) INTO v_remaining_credits
    FROM user_exam_credits
    WHERE user_id = p_user_id;

    RETURN v_remaining_credits > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Function to consume credit when starting exam
CREATE OR REPLACE FUNCTION consume_exam_credit(p_user_id UUID, p_exam_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_is_free BOOLEAN;
    v_can_access BOOLEAN;
BEGIN
    -- Check access
    SELECT can_user_access_exam(p_user_id, p_exam_id) INTO v_can_access;

    IF NOT v_can_access THEN
        RETURN false;
    END IF;

    -- Get exam type
    SELECT is_free INTO v_is_free FROM exams WHERE id = p_exam_id;

    -- Record attempt
    INSERT INTO exam_attempts (user_id, exam_id, is_free_attempt, credits_used)
    VALUES (p_user_id, p_exam_id, v_is_free, CASE WHEN v_is_free THEN 0 ELSE 1 END);

    -- Deduct credit if not free
    IF NOT v_is_free THEN
        UPDATE user_exam_credits
        SET used_credits = used_credits + 1
        WHERE user_id = p_user_id;
    END IF;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Function to increment user credits (used by admin when approving payment)
CREATE OR REPLACE FUNCTION increment_user_credits(p_user_id UUID, p_credits INT)
RETURNS VOID AS $$
BEGIN
    INSERT INTO user_exam_credits (user_id, total_credits, used_credits)
    VALUES (p_user_id, p_credits, 0)
    ON CONFLICT (user_id)
    DO UPDATE SET total_credits = user_exam_credits.total_credits + p_credits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE payment_packages IS 'Available payment packages for exam credits';
COMMENT ON TABLE user_exam_credits IS 'User exam credit balance';
COMMENT ON TABLE payment_transactions IS 'Payment transaction history';
COMMENT ON TABLE exam_attempts IS 'History of exam attempts by users';
