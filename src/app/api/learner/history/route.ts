import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
    try {
        const supabaseServer = await createClient()
        const { data: { user } } = await supabaseServer.auth.getUser()

        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const adminSupabase = createAdminClient()

        // Fetch completed exam attempts (new system)
        const { data: attempts, error: attemptsError } = await adminSupabase
            .from('exam_attempts')
            .select(`
                id,
                exam_id,
                score,
                total_points,
                correct_count,
                wrong_count,
                status,
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
            .eq('user_id', user.id)
            .eq('status', 'completed')
            .order('completed_at', { ascending: false })

        if (attemptsError) throw attemptsError

        // Fetch Milestone Results (keep existing)
        const { data: milestoneData, error: milestoneError } = await adminSupabase
            .from('milestone_results')
            .select(`
                id,
                total_score,
                qa_reports,
                created_at,
                milestones (
                    id,
                    title,
                    level
                )
            `)
            .eq('user_id', user.id)

        if (milestoneError) {
            console.warn('Milestone fetch error (ignored):', milestoneError)
        }

        const mappedAttempts = (attempts || []).map(a => {
            const startedAt = new Date(a.started_at).getTime()
            const completedAt = a.completed_at ? new Date(a.completed_at).getTime() : Date.now()
            const timeTaken = Math.floor((completedAt - startedAt) / 1000)
            const percentage = a.total_points > 0
                ? Math.round((a.score / a.total_points) * 100)
                : 0

            return {
                id: a.id,
                score: percentage,            // percentage 0-100 for display
                raw_score: a.score,           // actual score points
                total_points: a.total_points,
                total_correct: a.correct_count,
                wrong_count: a.wrong_count,
                time_taken: timeTaken,
                created_at: a.completed_at || a.started_at,
                attempt_number: a.attempt_number,
                type: 'exam',
                exams: a.exams,
            }
        })

        const mappedMilestones = (milestoneData || []).map(m => ({
            id: m.id,
            score: m.total_score,
            total_correct: m.qa_reports ? Object.keys(m.qa_reports).length : 0,
            time_taken: 0,
            created_at: m.created_at,
            type: 'milestone',
            exams: {
                id: (m.milestones as any)?.id,
                title: (m.milestones as any)?.title || 'Kiểm tra Mốc',
                level: `Mốc ${(m.milestones as any)?.level}`,
                part_type: 'Speaking AI',
            },
        }))

        // Merge and sort by date descending
        const combined = [...mappedAttempts, ...mappedMilestones]
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

        return NextResponse.json(combined)
    } catch (error: any) {
        console.error('History API error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
