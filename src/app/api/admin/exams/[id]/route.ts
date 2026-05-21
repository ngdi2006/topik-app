import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const adminAuthClient = createAdminClient()
        const resolvedParams = await context.params
        const examId = resolvedParams.id

        // Fetch exam
        const { data: exam, error } = await adminAuthClient
            .from('exams')
            .select('*')
            .eq('id', examId)
            .single()

        if (error || !exam) {
            return NextResponse.json({ success: false, error: 'Exam not found' }, { status: 404 })
        }

        return NextResponse.json({ success: true, data: exam, exam: exam }, { status: 200 })
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message || "Internal Server Error" }, { status: 500 })
    }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const adminAuthClient = createAdminClient()
        const resolvedParams = await context.params
        const examId = resolvedParams.id

        const body = await request.json()

        // Prepare update payload securely
        const updatePayload: any = {}
        if (body.title !== undefined) updatePayload.title = body.title
        if (body.level !== undefined) updatePayload.level = body.level
        if (body.duration !== undefined) updatePayload.duration = body.duration
        if (body.reading_duration !== undefined) updatePayload.reading_duration = body.reading_duration
        if (body.listening_duration !== undefined) updatePayload.listening_duration = body.listening_duration
        if (body.total_questions !== undefined) updatePayload.total_questions = body.total_questions
        if (body.status !== undefined) updatePayload.status = body.status
        if (body.display_order !== undefined) updatePayload.display_order = body.display_order
        if (body.is_free !== undefined) updatePayload.is_free = body.is_free
        if (body.free_attempts !== undefined) updatePayload.free_attempts = body.free_attempts
        if (body.credits_required !== undefined) updatePayload.credits_required = body.credits_required

        const { data: updatedExam, error } = await adminAuthClient
            .from('exams')
            .update(updatePayload)
            .eq('id', examId)
            .select()
            .single()

        if (error) {
            return NextResponse.json({ success: false, error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, data: updatedExam, exam: updatedExam }, { status: 200 })
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message || "Internal Server Error" }, { status: 500 })
    }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const adminAuthClient = createAdminClient()
        const resolvedParams = await context.params
        const examId = resolvedParams.id

        // Questions and results should be deleted based on ON DELETE CASCADE
        const { error } = await adminAuthClient
            .from('exams')
            .delete()
            .eq('id', examId)

        if (error) {
            return NextResponse.json({ success: false, error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true }, { status: 200 })
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message || "Internal Server Error" }, { status: 500 })
    }
}
