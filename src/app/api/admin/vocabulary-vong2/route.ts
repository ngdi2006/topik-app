import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
    try {
        const admin = createAdminClient()
        const { searchParams } = new URL(req.url)
        const industry = searchParams.get('industry')
        const type = searchParams.get('type')

        let query = admin.from('vocabulary_vong2').select('*').order('created_at', { ascending: false })
        if (industry) query = query.eq('industry', industry)
        if (type) query = query.eq('type', type)

        const { data, error } = await query
        if (error) throw error
        return NextResponse.json({ success: true, data })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const admin = createAdminClient()
        const body = await req.json()
        const { data, error } = await admin.from('vocabulary_vong2').insert(body).select().single()
        if (error) throw error
        return NextResponse.json({ success: true, data })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
