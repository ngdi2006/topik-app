import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const adminSupabase = createAdminClient()
        const resolvedParams = await context.params
        const userId = resolvedParams.id

        if (!userId) {
            return NextResponse.json({ error: 'Missing user ID' }, { status: 400 })
        }

        // Dùng adminClient để lấy danh sách điểm của user được chỉ định
        const { data, error } = await adminSupabase
            .from('exam_results')
            .select(`
                id,
                score,
                total_correct,
                time_taken,
                created_at,
                exams (
                    id,
                    title,
                    level,
                    part_type
                )
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false })

        if (error) {
            console.error(error)
            throw error
        }

        return NextResponse.json({ success: true, history: data }, { status: 200 })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
