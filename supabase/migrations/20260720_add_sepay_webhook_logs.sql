-- Store SePay webhook payloads for payment reconciliation.
-- This table is intentionally separate from payment_transactions so unmatched
-- bank transfers can be investigated without changing credit balances.

CREATE TABLE IF NOT EXISTS public.sepay_webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sepay_id TEXT,
    gateway TEXT,
    transaction_date TEXT,
    account_number TEXT,
    reference_number TEXT,
    amount_in INTEGER NOT NULL DEFAULT 0,
    content TEXT NOT NULL DEFAULT '',
    transaction_code TEXT,
    matched_transaction_id UUID REFERENCES public.payment_transactions(id) ON DELETE SET NULL,
    status TEXT NOT NULL CHECK (
        status IN (
            'received',
            'not_incoming',
            'no_transaction_code',
            'transaction_not_found',
            'amount_mismatch',
            'completed',
            'error'
        )
    ),
    message TEXT,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sepay_webhook_logs_created_at
    ON public.sepay_webhook_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sepay_webhook_logs_status
    ON public.sepay_webhook_logs(status);

CREATE INDEX IF NOT EXISTS idx_sepay_webhook_logs_transaction_code
    ON public.sepay_webhook_logs(transaction_code);

CREATE INDEX IF NOT EXISTS idx_sepay_webhook_logs_sepay_id
    ON public.sepay_webhook_logs(sepay_id);

ALTER TABLE public.sepay_webhook_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Admin can view SePay webhook logs"
        ON public.sepay_webhook_logs FOR SELECT
        USING (
            EXISTS (
                SELECT 1 FROM public.profiles
                WHERE profiles.id = auth.uid()
                AND profiles.role IN ('admin', 'teacher')
            )
        );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TABLE public.sepay_webhook_logs IS 'Audit log for SePay webhook payloads and payment reconciliation decisions';
