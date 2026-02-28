import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
    try {
        // 1. Authentication & Authorization Check
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // Check if the current user is really an admin
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        if (!profile || profile.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // 2. Fetch all users using Admin Service Role Key
        const adminAuthClient = createAdminClient()

        // Fetch users from Auth schema
        const { data: usersData, error: usersError } = await adminAuthClient.auth.admin.listUsers()
        if (usersError) {
            return NextResponse.json({ error: usersError.message }, { status: 500 })
        }

        // Fetch profiles for roles and names
        const { data: profiles, error: profilesError } = await adminAuthClient.from('profiles').select('*')
        if (profilesError) {
            return NextResponse.json({ error: profilesError.message }, { status: 500 })
        }

        // 3. Mapping data
        const result = usersData.users.map(u => {
            const prof = profiles.find(p => p.id === u.id)
            return {
                id: u.id,
                email: u.email,
                name: prof?.full_name || u.user_metadata?.full_name || 'Học viên',
                role: prof?.role || 'learner',
                groupName: prof?.group_name || '',
                status: 'Active',
                joinedAt: new Date(u.created_at).toISOString().split('T')[0]
            }
        })

        // Sort by joinedDate desc
        result.sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime())

        return NextResponse.json({ users: result }, { status: 200 })
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Internal Server Error" }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const { name, email, password, role, groupName } = await request.json()

        // 1. Authentication & Authorization Check
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        if (!profile || profile.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // 2. Create user with Admin Service Role Key
        const adminAuthClient = createAdminClient()

        const { data: newUser, error: createError } = await adminAuthClient.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true,
            user_metadata: {
                full_name: name
            }
        })

        if (createError) {
            return NextResponse.json({ error: createError.message }, { status: 400 })
        }

        const newUserId = newUser.user.id

        // 3. Upsert Role in Profiles Table
        const { error: profileError } = await adminAuthClient.from('profiles').upsert({
            id: newUserId,
            full_name: name,
            role: role || 'learner',
            group_name: groupName || ''
        })

        if (profileError) {
            // Rollback user creation if profile fails
            await adminAuthClient.auth.admin.deleteUser(newUserId)
            return NextResponse.json({ error: "Failed to create user profile: " + profileError.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, user: newUser.user }, { status: 200 })

    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Internal Server Error" }, { status: 500 })
    }
}
