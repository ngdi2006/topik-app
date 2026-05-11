// =====================================================================
// API: Get Exam Analysis
// =====================================================================

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
    request: Request,
    context: { params: Promise<{ attemptId: string }> }
) {
    try {
        const params = await context.params
        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const adminClient = createAdminClient()

        // Get analysis
        const { data: analysis, error } = await adminClient
            .from('exam_analysis')
            .select('*')
            .eq('attempt_id', params.attemptId)
            .eq('user_id', user.id)
            .single()

        if (error || !analysis) {
            return NextResponse.json(
                { success: false, error: 'Không tìm thấy phân tích' },
                { status: 404 }
            )
        }

        // Get attempt details
        const { data: attempt } = await adminClient
            .from('exam_attempts')
            .select('*, exams(title, level)')
            .eq('id', params.attemptId)
            .single()

        return NextResponse.json({
            success: true,
            analysis,
            attempt,
        })
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}
