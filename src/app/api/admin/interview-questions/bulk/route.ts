import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
    try {
        const admin = createAdminClient()
        const body = await req.json()
        
        if (!Array.isArray(body)) {
            return NextResponse.json({ success: false, error: 'Invalid data format, expected array' })
        }

        const { data, error } = await admin
            .from('interview_questions')
            .insert(body)
            .select()

        if (error) throw error

        return NextResponse.json({ success: true, data })
    } catch (error: any) {
        console.error('Bulk insert error:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
