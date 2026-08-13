import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
    try {
        const users = await request.json()

        if (!Array.isArray(users) || users.length === 0) {
             return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
        }

        // 1. Authentication & Authorization Check
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        if (!profile || !['admin', 'teacher'].includes(profile.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const adminAuthClient = createAdminClient()
        let successCount = 0
        const errors = []

        for (const u of users) {
            let { name, email, password, role, groupName, dateOfBirth } = u

            if (profile.role === 'teacher') {
                role = 'learner'
            }

            const { data: newUser, error: createError } = await adminAuthClient.auth.admin.createUser({
                email: email,
                password: password,
                email_confirm: true,
                app_metadata: {
                    role: role || 'learner'
                },
                user_metadata: {
                    full_name: name
                }
            })

            if (createError) {
                errors.push({ email, error: createError.message })
                continue
            }

            const newUserId = newUser.user.id

            const { error: profileError } = await adminAuthClient.from('profiles').upsert({
                id: newUserId,
                full_name: name,
                role: role || 'learner',
                group_name: groupName || '',
                date_of_birth: dateOfBirth || null
            })

            if (profileError) {
                await adminAuthClient.auth.admin.deleteUser(newUserId)
                errors.push({ email, error: "Failed to create profile: " + profileError.message })
                continue
            }
            
            successCount++
        }

        return NextResponse.json({ success: true, successCount, errors }, { status: 200 })

    } catch (error) {
        const message = error instanceof Error ? error.message : "Internal Server Error"
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
