import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const resolvedParams = await context.params
        const examId = resolvedParams.id
        const summaryOnly = new URL(request.url).searchParams.get('summary') === 'true'

        const adminSupabase = createAdminClient()
        const { data: exam, error: examError } = await adminSupabase
            .from('exams')
            .select('*')
            .eq('id', examId)
            .single()

        if (examError || !exam) return NextResponse.json({ error: 'Exam not found' }, { status: 404 })

        if (summaryOnly) return NextResponse.json({ exam })

        const { data: questions, error: qError } = await adminSupabase
            .from('questions')
            .select('*')
            .eq('exam_id', examId)
            .order('order_index', { ascending: true })

        if (qError) throw qError

        return NextResponse.json({ exam, questions })
    } catch (error: unknown) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 })
    }
}
