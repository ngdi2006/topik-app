// =====================================================================
// API: Exam Question Rule [ruleId] - Update & Delete
// =====================================================================

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PUT(
    request: Request,
    context: { params: Promise<{ id: string; ruleId: string }> }
) {
    try {
        const params = await context.params
        const body = await request.json()
        const adminClient = createAdminClient()

        const { data, error } = await adminClient
            .from('exam_question_rules')
            .update(body)
            .eq('id', params.ruleId)
            .eq('exam_id', params.id)
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
    context: { params: Promise<{ id: string; ruleId: string }> }
) {
    try {
        const params = await context.params
        const adminClient = createAdminClient()

        const { error } = await adminClient
            .from('exam_question_rules')
            .delete()
            .eq('id', params.ruleId)
            .eq('exam_id', params.id)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}
