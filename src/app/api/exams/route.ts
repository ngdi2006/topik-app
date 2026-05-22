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
        const { data: exams, error } = await adminSupabase
            .from('exams')
            .select('*')
            .eq('status', 'Published')
            .order('display_order', { ascending: true })
            .order('created_at', { ascending: false })
            .limit(6)

        if (error) throw error

        // 3. If user is logged in, calculate remaining free attempts
        if (user && exams && exams.length > 0) {
            const examIds = exams.map(e => e.id)
            
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

            const examsWithRemaining = exams.map(exam => {
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
        const examsWithDefaultRemaining = exams?.map(exam => ({
            ...exam,
            remaining_free_attempts: exam.free_attempts ?? 0
        }))

        return NextResponse.json(examsWithDefaultRemaining || [])
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
