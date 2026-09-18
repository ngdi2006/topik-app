import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdminApiPermission } from '@/lib/admin-api-auth'

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : 'Unknown error'
}

export async function GET(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await requireAdminApiPermission('interview')
        if (auth.error) return auth.error
        const { id } = await context.params
        const adminClient = createAdminClient()

        const { data, error } = await adminClient
            .from('interview_question_history')
            .select('*')
            .eq('question_id', id)
            .order('created_at', { ascending: false })

        if (error) {
            // If table does not exist yet, return empty list gracefully
            return NextResponse.json({ success: true, data: [] })
        }

        return NextResponse.json({ success: true, data: data || [] })
    } catch (error: unknown) {
        return NextResponse.json(
            { success: false, error: getErrorMessage(error) },
            { status: 500 }
        )
    }
}
