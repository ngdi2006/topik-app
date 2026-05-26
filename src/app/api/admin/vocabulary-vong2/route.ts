import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
    try {
        const admin = createAdminClient()
        const { searchParams } = new URL(req.url)
        const industry = searchParams.get('industry')
        const type = searchParams.get('type')
        const search = searchParams.get('search')
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '20')

        // Build count query
        let countQuery = admin.from('vocabulary_vong2').select('*', { count: 'exact', head: true })
        if (industry && industry !== 'ALL') countQuery = countQuery.eq('industry', industry)
        if (type && type !== 'ALL') countQuery = countQuery.eq('type', type)
        if (search) countQuery = countQuery.or(`word_kr.ilike.%${search}%,word_vi.ilike.%${search}%`)
        
        const { count, error: countError } = await countQuery
        if (countError) throw countError
        const total = count || 0

        // Build data query
        let query = admin.from('vocabulary_vong2').select('*').order('created_at', { ascending: false })
        if (industry && industry !== 'ALL') query = query.eq('industry', industry)
        if (type && type !== 'ALL') query = query.eq('type', type)
        if (search) query = query.or(`word_kr.ilike.%${search}%,word_vi.ilike.%${search}%`)
        
        const from = (page - 1) * limit
        const to = from + limit - 1
        query = query.range(from, to)

        const { data, error } = await query
        if (error) throw error

        return NextResponse.json({ 
            success: true, 
            data, 
            total, 
            page, 
            limit, 
            totalPages: Math.ceil(total / limit) 
        })
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
