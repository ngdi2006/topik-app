import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const resolvedParams = await context.params
        const examId = resolvedParams.id

        const adminSupabase = createAdminClient()
        const { data: exam, error: examError } = await adminSupabase
            .from('exams')
            .select('*')
            .eq('id', examId)
            .single()

        if (examError || !exam) return NextResponse.json({ error: 'Exam not found' }, { status: 404 })

        const { data: questions, error: qError } = await adminSupabase
            .from('questions')
            .select('*')
            .eq('exam_id', examId)
            .order('order_index', { ascending: true })

        if (qError) throw qError

        return NextResponse.json({ exam, questions })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
