import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
    try {
        const supabaseServer = await createClient()
        const { data: { user } } = await supabaseServer.auth.getUser()

        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const adminSupabase = createAdminClient()

        // 1. Fetch Exam Results
        const examPromise = adminSupabase
            .from('exam_results')
            .select(`
                id,
                score,
                total_correct,
                time_taken,
                created_at,
                exams (
                    id,
                    title,
                    level,
                    part_type
                )
            `)
            .eq('user_id', user.id)

        // 2. Fetch Milestone Results
        const milestonePromise = adminSupabase
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

        const [examRes, milestoneRes] = await Promise.all([examPromise, milestonePromise])

        if (examRes.error) throw examRes.error
        if (milestoneRes.error) throw milestoneRes.error

        const mappedExams = (examRes.data || []).map(e => ({ ...e, type: 'exam' }))

        const mappedMilestones = (milestoneRes.data || []).map(m => ({
            id: m.id,
            score: m.total_score,
            total_correct: m.qa_reports ? Object.keys(m.qa_reports).length : 0,
            time_taken: 0,
            created_at: m.created_at,
            type: 'milestone',
            exams: {
                id: m.milestones?.id,
                title: m.milestones?.title || "Kiểm tra Mốc",
                level: `Mốc ${m.milestones?.level}`,
                part_type: 'Speaking AI'
            }
        }))

        // Merge and Sort
        const combined = [...mappedExams, ...mappedMilestones].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

        return NextResponse.json(combined)
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
