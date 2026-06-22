import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
    try {
        const supabase = await createClient()
        const adminSupabase = createAdminClient()

        // 1. Get current user
        const { data: { user } } = await supabase.auth.getUser()

        // 2. Get exams
        let examsQuery = adminSupabase
            .from('exams')
            .select('*')
            .order('display_order', { ascending: true })
            .order('created_at', { ascending: false })
            .limit(6)

        let assignedExamIds: string[] = []
        // If user is logged in, fetch their internal assignments
        if (user) {
            // Get internal exam assignments for this user
            let assignments: any[] = []
            try {
                const { data } = await adminSupabase
                    .from('exam_assignments')
                    .select('exam_id')
                    .eq('user_id', user.id)
                if (data) assignments = data
            } catch (e) {
                // Handle if table doesn't exist yet
            }

            assignedExamIds = (assignments || []).map((a: any) => a.exam_id)

            if (assignedExamIds.length > 0) {
                examsQuery = examsQuery.in('status', ['Published', 'Internal'])
            } else {
                examsQuery = examsQuery.eq('status', 'Published')
            }
        } else {
            // Guest users only see published
            examsQuery = examsQuery.eq('status', 'Published')
        }

        const { data: exams, error } = await examsQuery

        if (error) throw error

        let filteredExams = exams || []
        if (user && assignedExamIds.length > 0) {
            filteredExams = filteredExams.filter(exam => {
                if (exam.status === 'Published') return true
                if (exam.status === 'Internal') return assignedExamIds.includes(exam.id)
                return false
            })
        }

        // 3. If user is logged in, calculate remaining free attempts
        if (user && filteredExams && filteredExams.length > 0) {
            const examIds = filteredExams.map(e => e.id)

            // Get attempt counts for these exams for this user
            const { data: attempts } = await adminSupabase
                .from('exam_attempts')
                .select('exam_id')
                .eq('user_id', user.id)
                .in('exam_id', examIds)

            const attemptCounts = (attempts || []).reduce((acc: any, attempt) => {
                acc[attempt.exam_id] = (acc[attempt.exam_id] || 0) + 1
                return acc
            }, {})

            const examsWithRemaining = filteredExams.map(exam => {
                const totalAttempts = attemptCounts[exam.id] || 0
                const configuredFree = exam.free_attempts ?? 0
                const remaining = Math.max(0, configuredFree - totalAttempts)
                return {
                    ...exam,
                    remaining_free_attempts: remaining
                }
            })

            return NextResponse.json(examsWithRemaining)
        }

        // If no user, just return exams with remaining = configured
        const examsWithDefaultRemaining = filteredExams?.map(exam => ({
            ...exam,
            remaining_free_attempts: exam.free_attempts ?? 0
        }))

        return NextResponse.json(examsWithDefaultRemaining || [])
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
