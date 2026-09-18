import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdminApiPermission } from '@/lib/admin-api-auth'

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : 'Unknown error'
}

export async function DELETE(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await requireAdminApiPermission('interview')
        if (auth.error) return auth.error
        const { id } = await context.params
        const adminClient = createAdminClient()

        const { error } = await adminClient
            .from('interview_question_assignments')
            .delete()
            .eq('id', id)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error: unknown) {
        return NextResponse.json(
            { success: false, error: getErrorMessage(error) },
            { status: 500 }
        )
    }
}
