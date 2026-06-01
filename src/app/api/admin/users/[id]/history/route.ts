import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!profile || !['admin', 'teacher'].includes(profile.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const adminSupabase = createAdminClient()
        const resolvedParams = await context.params
        const userId = resolvedParams.id

        if (!userId) {
            return NextResponse.json({ error: 'Missing user ID' }, { status: 400 })
        }

        const { data, error } = await adminSupabase
            .from('exam_attempts')
            .select(`
                id,
                score,
                total_points,
                correct_count,
                wrong_count,
                started_at,
                completed_at,
                attempt_number,
                exams (
                    id,
                    title,
                    level,
                    total_questions,
                    duration
                )
            `)
            .eq('user_id', userId)
            .eq('status', 'completed')
            .order('completed_at', { ascending: false })

        if (error) {
            throw error
        }

        const history = (data || []).map((attempt) => {
            const startedAt = new Date(attempt.started_at).getTime()
            const completedAt = attempt.completed_at ? new Date(attempt.completed_at).getTime() : startedAt
            const totalPoints = attempt.total_points || 0

            return {
                id: attempt.id,
                score: totalPoints > 0 ? Math.round((attempt.score / totalPoints) * 100) : 0,
                raw_score: attempt.score,
                total_points: attempt.total_points,
                total_correct: attempt.correct_count,
                wrong_count: attempt.wrong_count,
                time_taken: Math.max(0, Math.floor((completedAt - startedAt) / 1000)),
                created_at: attempt.completed_at || attempt.started_at,
                attempt_number: attempt.attempt_number,
                exams: attempt.exams,
            }
        })

        return NextResponse.json({ success: true, history }, { status: 200 })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal Server Error'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
