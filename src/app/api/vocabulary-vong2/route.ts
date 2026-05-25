import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const industry = searchParams.get('industry')
        const type = searchParams.get('type')

        const supabase = await createClient()

        let query = supabase
            .from('vocabulary_vong2')
            .select('*')
            .order('created_at', { ascending: false })

        if (industry && industry !== 'ALL') {
            query = query.eq('industry', industry)
        }

        if (type) {
            query = query.eq('type', type)
        }

        const { data, error } = await query

        if (error) throw error

        return NextResponse.json({ success: true, data: data || [] })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
