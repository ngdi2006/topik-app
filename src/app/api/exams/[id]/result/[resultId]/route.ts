import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request, context: { params: Promise<{ id: string, resultId: string }> }) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const resolvedParams = await context.params
        const examId = resolvedParams.id
        const resultId = resolvedParams.resultId

        const adminAuthClient = createAdminClient()

        // 1. Lấy Result
        const { data: resultData, error: resultError } = await adminAuthClient
            .from('exam_results')
            .select('*')
            .eq('id', resultId)
            .single()

        if (resultError || !resultData) {
            return NextResponse.json({ error: 'Không tìm thấy kết quả làm bài' }, { status: 404 })
        }

        // Bảo mật: Học viên chỉ xem được bài của mình (Admin có thể xem bất kỳ)
        // Check database user details if necessary, but simply matching IDs ensures standard security
        if (resultData.user_id !== user.id) {
            // However, we allow admins to view it.
            const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
            if (!profile || profile.role === 'learner') {
                return NextResponse.json({ error: 'Bạn không có quyền xem kết quả này' }, { status: 403 })
            }
        }

        // 2. Fetch Exam Info
        const { data: examData, error: examError } = await adminAuthClient
            .from('exams')
            .select('*')
            .eq('id', examId)
            .single()

        if (examError) {
            return NextResponse.json({ error: 'Không tìm thấy thông tin bài thi' }, { status: 404 })
        }

        // 3. Fetch Questions Full Options
        const { data: questionsData, error: qError } = await adminAuthClient
            .from('questions')
            .select('*')
            .eq('exam_id', examId)
            .order('order_index', { ascending: true })

        if (qError) {
            return NextResponse.json({ error: 'Không tải được danh sách câu hỏi gốc' }, { status: 500 })
        }

        return NextResponse.json({
            result: resultData,
            exam: examData,
            questions: questionsData || []
        }, { status: 200 })

    } catch (error: any) {
        console.error("Result API Error:", error)
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 })
    }
}
