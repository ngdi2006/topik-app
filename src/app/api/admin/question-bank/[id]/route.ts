// =====================================================================
// API: Question Bank [id] - Get, Update, Delete
// =====================================================================

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const adminClient = createAdminClient()
        const { data, error } = await adminClient
            .from('question_bank')
            .select('*')
            .eq('id', params.id)
            .single()

        if (error) throw error
        if (!data) {
            return NextResponse.json(
                { success: false, error: 'Không tìm thấy câu hỏi' },
                { status: 404 }
            )
        }

        return NextResponse.json({ success: true, data })
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json()

        const adminClient = createAdminClient()
        const { data, error } = await adminClient
            .from('question_bank')
            .update(body)
            .eq('id', params.id)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ success: true, data })
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const adminClient = createAdminClient()
        const { error } = await adminClient
            .from('question_bank')
            .delete()
            .eq('id', params.id)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}
