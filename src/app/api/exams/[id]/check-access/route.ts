import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(
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

        // Check if exam exists and get all needed info
        const { data: exam, error: examError } = await supabase
            .from('exams')
            .select('id, title, is_free, free_attempts, credits_required')
            .eq('id', examId)
            .single()

        if (examError || !exam) {
            return NextResponse.json({ error: 'Exam not found' }, { status: 404 })
        }

        // Get user credits
        const { data: creditsData } = await supabase
            .from('user_exam_credits')
            .select('remaining_credits')
            .eq('user_id', user.id)
            .single()
        
        const userCredits = creditsData?.remaining_credits || 0

        // Free exams: always accessible, no need for credit check
        if (exam.is_free) {
            return NextResponse.json({
                can_access: true,
                exam: {
                    id: exam.id,
                    title: exam.title,
                    is_free: true
                },
                user_credits: userCredits,
                previous_attempts: [],
                message: 'Đề thi miễn phí - không giới hạn lượt'
            })
        }

        // Count previous attempts
        const { count: attemptCount, error: countError } = await supabase
            .from('exam_attempts')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('exam_id', examId)

        const totalAttempts = attemptCount || 0
        const freeAttempts = exam.free_attempts || 1

        let canAccess = false
        
        // Logic: if attempts < free_attempts -> true
        // Else if user has enough credits -> true
        if (totalAttempts < freeAttempts) {
            canAccess = true
        } else if (userCredits >= (exam.credits_required || 1)) {
            canAccess = true
        }

        // Get previous attempts
        const { data: attempts } = await supabase
            .from('exam_attempts')
            .select('id, is_free_attempt, created_at')
            .eq('user_id', user.id)
            .eq('exam_id', examId)
            .order('created_at', { ascending: false })

        return NextResponse.json({
            can_access: canAccess,
            exam: {
                id: exam.id,
                title: exam.title,
                is_free: exam.is_free
            },
            user_credits: userCredits,
            previous_attempts: attempts || [],
            message: canAccess
                ? 'Bạn có thể làm bài thi này'
                : 'Bạn không đủ lượt làm bài. Vui lòng mua thêm.',
            debug: { totalAttempts, freeAttempts, userCredits } // useful for debugging
        })
    } catch (error: any) {
        console.error('Error checking exam access:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to check access' },
            { status: 500 }
        )
    }
}
