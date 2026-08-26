import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { permissionsForRole } from '@/lib/admin-permissions'
import { recordAdminUserActivity, type AdminUserAuditEntry } from '@/lib/admin-user-audit'

type ProfileRow = { id: string; full_name?: string | null; role?: string | null; group_name?: string | null; admin_permissions?: string[] | null }
type CreditRow = { user_id: string; remaining_credits: number }
type InterviewPlanRow = { name?: string | null; code?: string | null }
type InterviewEntitlementRow = {
    id: string
    user_id: string
    source: 'sepay' | 'admin_internal' | 'promotion'
    status: string
    starts_at: string
    expires_at: string
    interview_subscription_plans: InterviewPlanRow | InterviewPlanRow[] | null
}

async function getUserManagementRole(
    supabase: Awaited<ReturnType<typeof createClient>>,
    userId: string,
    authPermissions: unknown,
) {
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()

    if (!profile || !['admin', 'teacher', 'supporter'].includes(profile.role)) return null
    if (profile.role === 'admin') return profile.role

    const { data: permissionProfile, error } = await supabase
        .from('profiles')
        .select('admin_permissions')
        .eq('id', userId)
        .single()

    const storedPermissions = error ? authPermissions : permissionProfile?.admin_permissions
    if (!permissionsForRole(profile.role, storedPermissions).includes('users')) {
        return null
    }

    return profile.role
}

export async function GET() {
    try {
        // 1. Authentication & Authorization Check
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const managementRole = await getUserManagementRole(supabase, user.id, user.app_metadata?.admin_permissions)
        if (!managementRole) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // 2. Fetch all users using Admin Service Role Key
        const adminAuthClient = createAdminClient()

        const allAuthUsers: User[] = [];
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
        const allProfiles: ProfileRow[] = [];
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

        const allCredits: CreditRow[] = [];
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

        const allInterviewEntitlements: InterviewEntitlementRow[] = [];
        let entitlementPage = 0;
        let entitlementHasMore = true;
        while (entitlementHasMore) {
            const { data, error } = await adminAuthClient
                .from('user_interview_entitlements')
                .select('id, user_id, source, status, starts_at, expires_at, interview_subscription_plans(name, code)')
                .order('expires_at', { ascending: false })
                .range(entitlementPage * 1000, (entitlementPage + 1) * 1000 - 1);
            if (error) return NextResponse.json({ error: error.message }, { status: 500 });
            allInterviewEntitlements.push(...(data as unknown as InterviewEntitlementRow[]));
            entitlementHasMore = data.length === 1000;
            entitlementPage++;
        }

        const latestInterviewAccessByUser = new Map<string, InterviewEntitlementRow>();
        for (const entitlement of allInterviewEntitlements) {
            const current = latestInterviewAccessByUser.get(entitlement.user_id)
            const entitlementIsActive = entitlement.status === 'active' && new Date(entitlement.expires_at).getTime() > Date.now()
            const currentIsActive = current?.status === 'active' && new Date(current.expires_at).getTime() > Date.now()
            if (!current || (entitlementIsActive && !currentIsActive)) {
                latestInterviewAccessByUser.set(entitlement.user_id, entitlement);
            }
        }

        // 3. Mapping data
        const result = allAuthUsers.map(u => {
            const prof = allProfiles.find(p => p.id === u.id)
            const credit = allCredits.find(c => c.user_id === u.id)
            const entitlement = latestInterviewAccessByUser.get(u.id)
            const plan = Array.isArray(entitlement?.interview_subscription_plans)
                ? entitlement.interview_subscription_plans[0]
                : entitlement?.interview_subscription_plans
            const accessActive = Boolean(
                entitlement?.status === 'active' && new Date(entitlement.expires_at).getTime() > Date.now(),
            )
            const adminActivity = Array.isArray(u.app_metadata?.admin_user_audit)
                ? u.app_metadata.admin_user_audit as AdminUserAuditEntry[]
                : []
            return {
                id: u.id,
                email: u.email,
                name: prof?.full_name || u.user_metadata?.full_name || 'Học viên',
                role: prof?.role || 'learner',
                adminPermissions: prof?.admin_permissions || u.app_metadata?.admin_permissions || [],
                adminActivity,
                lastAdminActivity: adminActivity[0] || null,
                groupName: prof?.group_name || '',
                remainingCredits: credit?.remaining_credits ?? 0,
                status: 'Active',
                joinedAt: new Date(u.created_at).toISOString().split('T')[0],
                interviewAccess: entitlement ? {
                    id: entitlement.id,
                    active: accessActive,
                    source: entitlement.source,
                    startsAt: entitlement.starts_at,
                    expiresAt: entitlement.expires_at,
                    planName: plan?.name || null,
                } : null,
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
        const body = await request.json()
        const { name, email, password, groupName, dateOfBirth } = body
        let { role } = body

        // 1. Authentication & Authorization Check
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const managementRole = await getUserManagementRole(supabase, user.id, user.app_metadata?.admin_permissions)
        if (!managementRole) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // If teacher, force role to learner
        if (managementRole === 'teacher') {
            role = 'learner'
        }

        // 2. Create user with Admin Service Role Key
        const adminAuthClient = createAdminClient()

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

        await recordAdminUserActivity({
            targetUserId: newUserId,
            actor: user,
            actorRole: managementRole,
            action: 'user_created',
            label: 'Tạo tài khoản người dùng',
            details: { role: role || 'learner', groupName: groupName || null },
        })

        return NextResponse.json({ success: true, user: newUser.user }, { status: 200 })

    } catch (error) {
        const message = error instanceof Error ? error.message : "Internal Server Error"
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
