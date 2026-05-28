// =====================================================================
// API: Question Bank [id] - Get, Update, Delete
// =====================================================================

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const adminClient = createAdminClient()
        const { data, error } = await adminClient
            .from('question_bank')
            .select('*')
            .eq('id', id)
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
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const body = await request.json()

        // Remove fields that shouldn't be updated
        const { id: _, created_at, updated_at, created_by, category, ...updateData } = body

        const adminClient = createAdminClient()
        const { data, error } = await adminClient
            .from('question_bank')
            .update(updateData)
            .eq('id', id)
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
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const adminClient = createAdminClient()
        const { error } = await adminClient
            .from('question_bank')
            .delete()
            .eq('id', id)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}
