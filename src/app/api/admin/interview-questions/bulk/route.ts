import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { requireAdminApiPermission } from '@/lib/admin-api-auth'

export async function POST(req: Request) {
    try {
        const auth = await requireAdminApiPermission('interview')
        if (auth.error) return auth.error
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
    } catch (error: unknown) {
        console.error('Bulk insert error:', error)
        return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
    }
}
