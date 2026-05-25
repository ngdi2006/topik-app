import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
    try {
        const admin = createAdminClient()
        const body = await req.json()
        const { data, error } = await admin.from('vocabulary_vong2').update(body).eq('id', params.id).select().single()
        if (error) throw error
        return NextResponse.json({ success: true, data })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    try {
        const admin = createAdminClient()
        const { error } = await admin.from('vocabulary_vong2').delete().eq('id', params.id)
        if (error) throw error
        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
