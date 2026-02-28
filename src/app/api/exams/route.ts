import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
    try {
        const adminSupabase = createAdminClient()
        const { data, error } = await adminSupabase
            .from('exams')
            .select('*')
            .eq('status', 'Published')
            .order('created_at', { ascending: false })
            .limit(6)

        if (error) throw error
        return NextResponse.json(data)
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
