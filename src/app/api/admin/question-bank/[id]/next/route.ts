import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params
        const adminClient = createAdminClient()

        // Get current question's category and created_at
        const { data: currentQ, error: currentError } = await adminClient
            .from('question_bank')
            .select('category_id, created_at')
            .eq('id', id)
            .single()

        if (currentError || !currentQ) {
            return NextResponse.json({ success: false, error: 'Question not found' }, { status: 404 })
        }

        // Get all questions in the same category ordered by created_at DESC, id DESC
        const { data: allQuestions, error: allQError } = await adminClient
            .from('question_bank')
            .select('id')
            .eq('category_id', currentQ.category_id)
            .order('created_at', { ascending: false })
            .order('id', { ascending: false })

        if (allQError || !allQuestions) {
            return NextResponse.json({ success: true, data: null })
        }

        const currentIndex = allQuestions.findIndex(q => q.id === id)
        
        if (currentIndex === -1 || currentIndex === allQuestions.length - 1) {
            // Not found or is the last one
            return NextResponse.json({ success: true, data: null })
        }

        const nextQ = allQuestions[currentIndex + 1]
        return NextResponse.json({ success: true, data: nextQ })
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}
