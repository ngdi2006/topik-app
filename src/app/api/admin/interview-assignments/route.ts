import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : 'Unknown error'
}

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const adminClient = createAdminClient()
        const { data: profile } = await adminClient
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .maybeSingle()

        const userRole = profile?.role || 'user'
        const isSuperAdmin = userRole === 'admin'

        let query = adminClient
            .from('interview_question_assignments')
            .select('*')
            .order('created_at', { ascending: false })

        // If teacher, only return assignments for this teacher
        if (!isSuperAdmin) {
            query = query.eq('teacher_id', user.id)
        }

        const { data: assignments, error } = await query

        if (error) {
            // Table might not exist yet or empty
            return NextResponse.json({ success: true, data: [] })
        }

        // Fetch auth users & profiles map for teacher info
        const { data: authData } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
        const { data: profiles } = await adminClient.from('profiles').select('id, full_name, role')

        const authMap = new Map((authData?.users || []).map((u) => [u.id, u]))
        const profileMap = new Map((profiles || []).map((p) => [p.id, p]))

        // Fetch all questions with pagination for accurate review stats
        const questionsList: Array<{ id: string; category: string; order_index: number | null; review_status: string | null }> = []
        for (let from = 0; ; from += 1000) {
            const { data, error: qErr } = await adminClient
                .from('interview_questions')
                .select('id, category, order_index, review_status')
                .range(from, from + 999)
            if (qErr) break
            if (data) questionsList.push(...data)
            if (!data || data.length < 1000) break
        }

        const enrichedAssignments = (assignments || []).map((assignment: any) => {
            const inScopeQuestions = questionsList.filter((q: any) => {
                if (assignment.category && q.category !== assignment.category) return false
                if (assignment.from_order_index !== null && assignment.from_order_index !== undefined) {
                    if ((q.order_index ?? 0) < assignment.from_order_index) return false
                }
                if (assignment.to_order_index !== null && assignment.to_order_index !== undefined) {
                    if ((q.order_index ?? 0) > assignment.to_order_index) return false
                }
                return true
            })

            const total = inScopeQuestions.length
            const verified = inScopeQuestions.filter((q: any) => q.review_status === 'verified').length
            const progressPercent = total > 0 ? Math.round((verified / total) * 100) : 0

            const teacherAuth = authMap.get(assignment.teacher_id)
            const teacherProfile = profileMap.get(assignment.teacher_id)

            return {
                ...assignment,
                teacher: {
                    id: assignment.teacher_id,
                    full_name: teacherProfile?.full_name || teacherAuth?.user_metadata?.full_name || teacherAuth?.email || 'Giáo viên',
                    email: teacherAuth?.email || null,
                    role: teacherProfile?.role || teacherAuth?.app_metadata?.role || 'user',
                },
                total_questions: total,
                verified_questions: verified,
                progress_percent: progressPercent,
            }
        })

        return NextResponse.json({ success: true, data: enrichedAssignments })
    } catch (error: unknown) {
        return NextResponse.json(
            { success: false, error: getErrorMessage(error) },
            { status: 500 }
        )
    }
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { teacher_id, category, from_order_index, to_order_index, notes } = body

        if (!teacher_id) {
            return NextResponse.json({ success: false, error: 'Vui lòng chọn giáo viên' }, { status: 400 })
        }

        const adminClient = createAdminClient()
        const { data, error } = await adminClient
            .from('interview_question_assignments')
            .insert({
                teacher_id,
                category: category || null,
                from_order_index: from_order_index !== undefined && from_order_index !== '' ? Number(from_order_index) : null,
                to_order_index: to_order_index !== undefined && to_order_index !== '' ? Number(to_order_index) : null,
                assigned_by: user.id,
                notes: notes || null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ success: true, data })
    } catch (error: unknown) {
        return NextResponse.json(
            { success: false, error: getErrorMessage(error) },
            { status: 500 }
        )
    }
}
