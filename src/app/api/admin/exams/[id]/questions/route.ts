import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const adminAuthClient = createAdminClient()
        const resolvedParams = await context.params
        const examId = resolvedParams.id

        const body = await request.json()
        const { question_text, options, correct_answer, passage, order_index } = body

        // Validate basic inputs (you can add more robust validation)
        if (!question_text || !Array.isArray(options) || options.length !== 4 || correct_answer === undefined) {
            return NextResponse.json({ error: 'Missing required fields or invalid options' }, { status: 400 })
        }

        const { data: newQuestion, error } = await adminAuthClient
            .from('questions')
            .insert({
                exam_id: examId,
                question_text,
                options,
                correct_answer,
                passage: passage || null,
                order_index: order_index || 0
            })
            .select()
            .single()

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        // Increment exam total questions asynchronously
        await adminAuthClient.rpc('increment_total_questions', { exam_id: examId })

        return NextResponse.json({ success: true, question: newQuestion }, { status: 201 })
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Internal Server Error" }, { status: 500 })
    }
}
