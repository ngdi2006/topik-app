import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PUT(request: Request, context: { params: Promise<{ id: string, qId: string }> }) {
    try {
        const adminAuthClient = createAdminClient()
        const resolvedParams = await context.params
        const { id: examId, qId } = resolvedParams

        const body = await request.json()
        const { question_text, options, correct_answer, passage, order_index } = body

        // Prepare update payload securely
        const updatePayload: any = {}
        if (question_text !== undefined) updatePayload.question_text = question_text
        if (options !== undefined) updatePayload.options = options
        if (correct_answer !== undefined) updatePayload.correct_answer = correct_answer
        if (passage !== undefined) updatePayload.passage = passage
        if (order_index !== undefined) updatePayload.order_index = order_index

        const { data: updatedQuestion, error } = await adminAuthClient
            .from('questions')
            .update(updatePayload)
            .eq('id', qId)
            .select()
            .single()

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, question: updatedQuestion }, { status: 200 })
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Internal Server Error" }, { status: 500 })
    }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string, qId: string }> }) {
    try {
        const adminAuthClient = createAdminClient()
        const resolvedParams = await context.params
        const { id: examId, qId } = resolvedParams

        const { error } = await adminAuthClient
            .from('questions')
            .delete()
            .eq('id', qId)

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        // Decrement exam total questions asynchronously
        await adminAuthClient.rpc('decrement_total_questions', { exam_id: examId })

        return NextResponse.json({ success: true }, { status: 200 })
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Internal Server Error" }, { status: 500 })
    }
}
