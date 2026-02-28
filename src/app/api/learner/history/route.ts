import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
    try {
        const supabaseServer = await createClient()
        const { data: { user } } = await supabaseServer.auth.getUser()

        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const adminSupabase = createAdminClient()
        // Dùng adminClient để lấy danh sách điểm của user hiện tại (tránh lỗi config RLS local của Supabase)
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
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

        if (error) throw error
        return NextResponse.json(data)
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
