import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id: examId } = await params

        // Call database function to consume credit
        const { data: success, error: consumeError } = await supabase
            .rpc('consume_exam_credit', {
                p_user_id: user.id,
                p_exam_id: examId
            })

        if (consumeError) throw consumeError

        if (!success) {
            return NextResponse.json(
                { error: 'Không thể bắt đầu bài thi. Vui lòng kiểm tra lại quyền truy cập.' },
                { status: 403 }
            )
        }

        // Get the created attempt
        const { data: attempt } = await supabase
            .from('exam_attempts')
            .select('*')
            .eq('user_id', user.id)
            .eq('exam_id', examId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

        return NextResponse.json({
            success: true,
            attempt,
            message: 'Đã tiêu lượt làm bài thành công'
        })
    } catch (error: any) {
        console.error('Error consuming exam credit:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to consume credit' },
            { status: 500 }
        )
    }
}
