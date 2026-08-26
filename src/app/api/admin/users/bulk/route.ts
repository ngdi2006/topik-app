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
        if (!profile || !['admin', 'teacher', 'supporter'].includes(profile.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const adminAuthClient = createAdminClient()
        let successCount = 0
        const errors: Array<{ email: string; error: string }> = []
        const skipped: Array<{ email: string; reason: string }> = []

        // Load the existing Auth directory once. This avoids sending one failed
        // create request per duplicate email during repeated Excel imports.
        const existingEmails = new Set<string>()
        const perPage = 1000
        for (let page = 1; ; page += 1) {
            const { data, error } = await adminAuthClient.auth.admin.listUsers({ page, perPage })
            if (error) throw error
            for (const existingUser of data.users) {
                if (existingUser.email) existingEmails.add(existingUser.email.trim().toLowerCase())
            }
            if (data.users.length < perPage) break
        }

        for (const u of users) {
            const { password, groupName, dateOfBirth } = u
            let { name, email, role } = u

            email = String(email || '').trim().toLowerCase()
            name = String(name || '').trim()

            if (!email || !password) {
                errors.push({ email: email || '(trống)', error: 'Thiếu email hoặc mật khẩu' })
                continue
            }

            if (existingEmails.has(email)) {
                skipped.push({ email, reason: 'Tài khoản đã tồn tại' })
                continue
            }

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
                if (createError.message.toLowerCase().includes('already been registered')) {
                    existingEmails.add(email)
                    skipped.push({ email, reason: 'Tài khoản đã tồn tại' })
                    continue
                }
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
            existingEmails.add(email)
        }

        return NextResponse.json({
            success: true,
            successCount,
            skippedCount: skipped.length,
            skipped,
            errors,
        }, { status: 200 })

    } catch (error) {
        const message = error instanceof Error ? error.message : "Internal Server Error"
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
