-- Migration: 202608280002_interview_assignments_and_history.sql
-- Description: Add teacher assignments and audit history for interview questions (Vòng 2)

-- 1. Add review status fields to interview_questions if not exists
ALTER TABLE public.interview_questions
ADD COLUMN IF NOT EXISTS review_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_interview_questions_review_status 
ON public.interview_questions (review_status);

-- 2. Create interview_question_assignments table
CREATE TABLE IF NOT EXISTS public.interview_question_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    category TEXT NULL,
    from_order_index INTEGER NULL,
    to_order_index INTEGER NULL,
    assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_iq_assignments_teacher_id 
ON public.interview_question_assignments (teacher_id);

CREATE INDEX IF NOT EXISTS idx_iq_assignments_category 
ON public.interview_question_assignments (category);

-- 3. Create interview_question_history table for auditing edits
CREATE TABLE IF NOT EXISTS public.interview_question_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES public.interview_questions(id) ON DELETE CASCADE,
    changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    changed_by_name TEXT NULL,
    changed_by_email TEXT NULL,
    action_type TEXT NOT NULL, -- 'quick_answer_edit', 'full_edit', 'mark_verified', 'mark_pending', 'order_change'
    previous_data JSONB NULL,
    new_data JSONB NULL,
    change_summary TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_iq_history_question_id 
ON public.interview_question_history (question_id);

CREATE INDEX IF NOT EXISTS idx_iq_history_changed_by 
ON public.interview_question_history (changed_by);

CREATE INDEX IF NOT EXISTS idx_iq_history_created_at 
ON public.interview_question_history (created_at DESC);

-- Enable RLS
ALTER TABLE public.interview_question_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_question_history ENABLE ROW LEVEL SECURITY;

-- Policies for interview_question_assignments
DROP POLICY IF EXISTS "Admins and teachers can read assignments" ON public.interview_question_assignments;
CREATE POLICY "Admins and teachers can read assignments"
ON public.interview_question_assignments
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admins can manage assignments" ON public.interview_question_assignments;
CREATE POLICY "Admins can manage assignments"
ON public.interview_question_assignments
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- Policies for interview_question_history
DROP POLICY IF EXISTS "Authenticated users can read history" ON public.interview_question_history;
CREATE POLICY "Authenticated users can read history"
ON public.interview_question_history
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert history" ON public.interview_question_history;
CREATE POLICY "Authenticated users can insert history"
ON public.interview_question_history
FOR INSERT
TO authenticated
WITH CHECK (true);
