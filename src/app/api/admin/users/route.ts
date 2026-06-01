import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
    try {
        // 1. Authentication & Authorization Check
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // Check if the current user is really an admin
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        if (!profile || !['admin', 'teacher'].includes(profile.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // 2. Fetch all users using Admin Service Role Key
        const adminAuthClient = createAdminClient()

        const allAuthUsers: any[] = [];
        let authPage = 1;
        let authHasMore = true;
        while (authHasMore) {
            const { data, error } = await adminAuthClient.auth.admin.listUsers({ page: authPage, perPage: 1000 });
            if (error) return NextResponse.json({ error: error.message }, { status: 500 });
            allAuthUsers.push(...data.users);
            if (data.users.length < 1000) {
                authHasMore = false;
            } else {
                authPage++;
            }
        }

        // Fetch profiles for roles and names
        const allProfiles: any[] = [];
        let profilePage = 0;
        let profileHasMore = true;
        while (profileHasMore) {
            const { data, error } = await adminAuthClient.from('profiles').select('*').range(profilePage * 1000, (profilePage + 1) * 1000 - 1);
            if (error) return NextResponse.json({ error: error.message }, { status: 500 });
            allProfiles.push(...data);
            if (data.length < 1000) {
                profileHasMore = false;
            } else {
                profilePage++;
            }
        }

        const allCredits: any[] = [];
        let creditPage = 0;
        let creditHasMore = true;
        while (creditHasMore) {
            const { data, error } = await adminAuthClient.from('user_exam_credits').select('user_id, remaining_credits').range(creditPage * 1000, (creditPage + 1) * 1000 - 1);
            if (error) return NextResponse.json({ error: error.message }, { status: 500 });
            allCredits.push(...data);
            if (data.length < 1000) {
                creditHasMore = false;
            } else {
                creditPage++;
            }
        }

        // 3. Mapping data
        const result = allAuthUsers.map(u => {
            const prof = allProfiles.find(p => p.id === u.id)
            const credit = allCredits.find(c => c.user_id === u.id)
            return {
                id: u.id,
                email: u.email,
                name: prof?.full_name || u.user_metadata?.full_name || 'Học viên',
                role: prof?.role || 'learner',
                groupName: prof?.group_name || '',
                remainingCredits: credit?.remaining_credits ?? 0,
                status: 'Active',
                joinedAt: new Date(u.created_at).toISOString().split('T')[0]
            }
        })

        // Sort by joinedDate desc
        result.sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime())

        return NextResponse.json({ users: result }, { status: 200 })
    } catch (error) {
        const message = error instanceof Error ? error.message : "Internal Server Error"
        return NextResponse.json({ error: message }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        let { name, email, password, role, groupName, dateOfBirth } = await request.json()

        // 1. Authentication & Authorization Check
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        if (!profile || !['admin', 'teacher'].includes(profile.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // If teacher, force role to learner
        if (profile.role === 'teacher') {
            role = 'learner'
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
            group_name: groupName || '',
            date_of_birth: dateOfBirth || null
        })

        if (profileError) {
            // Rollback user creation if profile fails
            await adminAuthClient.auth.admin.deleteUser(newUserId)
            return NextResponse.json({ error: "Failed to create user profile: " + profileError.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, user: newUser.user }, { status: 200 })

    } catch (error) {
        const message = error instanceof Error ? error.message : "Internal Server Error"
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
