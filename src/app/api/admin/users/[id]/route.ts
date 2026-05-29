import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const resolvedParams = await context.params
        const userId = resolvedParams.id

        // 1. Auth check
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // Check Admin
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        if (!profile || profile.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // Check self deletion
        if (user.id === userId) {
            return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 })
        }

        // 2. Perform deletion via Admin Auth api Client
        const adminAuthClient = createAdminClient()
        
        // Delete related records manually to avoid foreign key constraint errors
        await adminAuthClient.from('exam_results').delete().eq('user_id', userId)
        await adminAuthClient.from('user_exams').delete().eq('user_id', userId)
        await adminAuthClient.from('user_exam_credits').delete().eq('user_id', userId)
        await adminAuthClient.from('profiles').delete().eq('id', userId)

        const { error } = await adminAuthClient.auth.admin.deleteUser(userId)

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true }, { status: 200 })
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Internal Server Error" }, { status: 500 })
    }
}
