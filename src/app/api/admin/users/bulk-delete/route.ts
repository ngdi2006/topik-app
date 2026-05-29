import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
    try {
        const { userIds } = await request.json()

        if (!Array.isArray(userIds) || userIds.length === 0) {
             return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
        }

        // 1. Authentication & Authorization Check
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        if (!profile || profile.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const adminAuthClient = createAdminClient()
        let successCount = 0
        const errors = []

        for (const id of userIds) {
            // Delete related records manually to avoid foreign key constraint errors
            await adminAuthClient.from('exam_results').delete().eq('user_id', id)
            await adminAuthClient.from('user_exams').delete().eq('user_id', id)
            await adminAuthClient.from('user_exam_credits').delete().eq('user_id', id)
            await adminAuthClient.from('profiles').delete().eq('id', id)

            const { error } = await adminAuthClient.auth.admin.deleteUser(id)
            if (error) {
                errors.push({ id, error: error.message })
            } else {
                successCount++
            }
        }

        return NextResponse.json({ success: true, successCount, errors }, { status: 200 })

    } catch (error) {
        const message = error instanceof Error ? error.message : "Internal Server Error"
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
