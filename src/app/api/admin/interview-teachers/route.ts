import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : 'Unknown error'
}

export async function GET() {
    try {
        const adminClient = createAdminClient()

        // 1. Fetch auth users
        const { data: authData, error: authError } = await adminClient.auth.admin.listUsers({
            perPage: 1000,
        })
        if (authError) throw authError

        // 2. Fetch profiles
        const { data: profiles, error: profileError } = await adminClient
            .from('profiles')
            .select('id, full_name, role, group_name')

        if (profileError) {
            console.warn('[Interview Teachers] Profile lookup warning:', profileError.message)
        }

        const profileMap = new Map((profiles || []).map((p) => [p.id, p]))

        const combinedUsers = (authData.users || []).map((user) => {
            const profile = profileMap.get(user.id)
            const role = profile?.role || user.app_metadata?.role || user.user_metadata?.role || 'learner'
            const fullName = profile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || null

            return {
                id: user.id,
                email: user.email || null,
                full_name: fullName,
                role: role,
                group_name: profile?.group_name || null,
            }
        })

        // Sort: Teachers and Admins first, then alphabetically by name/email
        const sortedUsers = combinedUsers.sort((a, b) => {
            const isPriorityA = a.role === 'teacher' || a.role === 'admin' || a.role === 'supporter'
            const isPriorityB = b.role === 'teacher' || b.role === 'admin' || b.role === 'supporter'
            if (isPriorityA && !isPriorityB) return -1
            if (!isPriorityA && isPriorityB) return 1

            const nameA = (a.full_name || a.email || '').toLowerCase()
            const nameB = (b.full_name || b.email || '').toLowerCase()
            return nameA.localeCompare(nameB, 'vi')
        })

        return NextResponse.json({
            success: true,
            data: sortedUsers,
        })
    } catch (error: unknown) {
        return NextResponse.json(
            { success: false, error: getErrorMessage(error) },
            { status: 500 }
        )
    }
}
