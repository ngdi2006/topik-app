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
            return NextResponse.json({ error: 'Exam not found' }, { status: 404 })
        }

        // Fetch questions for this exam
        const { data: questions, error: qError } = await adminAuthClient
            .from('questions')
            .select('*')
            .eq('exam_id', examId)
            .order('order_index', { ascending: true })

        if (qError) {
            return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 })
        }

        return NextResponse.json({ exam, questions: questions || [] }, { status: 200 })
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Internal Server Error" }, { status: 500 })
    }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const adminAuthClient = createAdminClient()
        const resolvedParams = await context.params
        const examId = resolvedParams.id

        const body = await request.json()
        const { title, level, duration, total_questions, status } = body

        // Prepare update payload securely
        const updatePayload: any = {}
        if (title !== undefined) updatePayload.title = title
        if (level !== undefined) updatePayload.level = level
        if (duration !== undefined) updatePayload.duration = duration
        if (total_questions !== undefined) updatePayload.total_questions = total_questions
        if (status !== undefined) updatePayload.status = status

        const { data: updatedExam, error } = await adminAuthClient
            .from('exams')
            .update(updatePayload)
            .eq('id', examId)
            .select()
            .single()

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, exam: updatedExam }, { status: 200 })
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Internal Server Error" }, { status: 500 })
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
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true }, { status: 200 })
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Internal Server Error" }, { status: 500 })
    }
}
