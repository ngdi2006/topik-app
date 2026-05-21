import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

async function checkAdmin(supabase: any) {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return null

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!profile || profile.role !== 'admin') return null
    return user
}

// GET: Fetch all fixed free questions for an exam
export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id: examId } = await context.params
        const supabase = await createClient()
        const user = await checkAdmin(supabase)
        if (!user) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const admin = createAdminClient()

        const { data, error } = await admin
            .from('exam_free_questions')
            .select(`
                id,
                exam_id,
                question_bank_id,
                question_type,
                order_index,
                created_at,
                question_bank (
                    id,
                    question_type,
                    category_id,
                    level,
                    question_text,
                    audio_url
                )
            `)
            .eq('exam_id', examId)
            .order('question_type')
            .order('order_index')

        if (error) throw error

        return NextResponse.json(data || [])
    } catch (error: any) {
        console.error('Error fetching free questions:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to fetch free questions' },
            { status: 500 }
        )
    }
}

// POST: Add questions to free question set
export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id: examId } = await context.params
        const supabase = await createClient()
        const user = await checkAdmin(supabase)
        if (!user) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const body = await request.json()
        const { question_ids } = body

        if (!Array.isArray(question_ids) || question_ids.length === 0) {
            return NextResponse.json(
                { error: 'question_ids must be a non-empty array' },
                { status: 400 }
            )
        }

        const admin = createAdminClient()

        const { data: questions, error: fetchError } = await admin
            .from('question_bank')
            .select('id, question_type')
            .in('id', question_ids)

        if (fetchError) throw fetchError

        const { data: existing } = await admin
            .from('exam_free_questions')
            .select('order_index')
            .eq('exam_id', examId)
            .order('order_index', { ascending: false })
            .limit(1)

        const startIndex = existing && existing.length > 0 ? existing[0].order_index + 1 : 0

        const insertData = questions!.map((q: any, idx: number) => ({
            exam_id: examId,
            question_bank_id: q.id,
            question_type: q.question_type,
            order_index: startIndex + idx
        }))

        const { data, error } = await admin
            .from('exam_free_questions')
            .insert(insertData)
            .select()

        if (error) {
            if (error.code === '23505') {
                return NextResponse.json(
                    { error: 'Một số câu hỏi đã có trong danh sách miễn phí' },
                    { status: 409 }
                )
            }
            throw error
        }

        return NextResponse.json({ success: true, data })
    } catch (error: any) {
        console.error('Error adding free questions:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to add free questions' },
            { status: 500 }
        )
    }
}

// DELETE: Remove a question from free question set
export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id: examId } = await context.params
        const supabase = await createClient()
        const user = await checkAdmin(supabase)
        if (!user) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const questionId = searchParams.get('question_id')

        if (!questionId) {
            return NextResponse.json(
                { error: 'question_id query parameter is required' },
                { status: 400 }
            )
        }

        const admin = createAdminClient()

        const { error } = await admin
            .from('exam_free_questions')
            .delete()
            .eq('exam_id', examId)
            .eq('question_bank_id', questionId)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Error deleting free question:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to delete free question' },
            { status: 500 }
        )
    }
}
