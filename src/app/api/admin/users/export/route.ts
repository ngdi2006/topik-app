import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
    try {
        const { userIds } = await request.json()

        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return NextResponse.json({ error: 'No userIds provided' }, { status: 400 })
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

        // 2. Fetch profiles for roles and names
        const { data: profiles, error: profilesError } = await adminAuthClient
            .from('profiles')
            .select('id, full_name, group_name')
            .in('id', userIds)
            
        if (profilesError) {
            return NextResponse.json({ error: profilesError.message }, { status: 500 })
        }

        // Fetch users from Auth schema to get emails
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

        // Fetch exam scores (all attempts)
        const { data: examAttempts, error: examError } = await adminAuthClient
            .from('exam_attempts')
            .select('user_id, score, total_points, completed_at, exams(title)')
            .in('user_id', userIds)
            .eq('status', 'completed')
            .order('completed_at', { ascending: false })

        if (examError) {
            return NextResponse.json({ error: examError.message }, { status: 500 })
        }

        // Group by user
        const userScores = new Map()
        
        if (examAttempts) {
            for (const attempt of examAttempts) {
                if (!userScores.has(attempt.user_id)) {
                    userScores.set(attempt.user_id, [])
                }
                userScores.get(attempt.user_id).push(attempt)
            }
        }

        // 3. Mapping data
        const result = profiles.map(prof => {
            const authUser = allAuthUsers.find(u => u.id === prof.id)
            const attempts = userScores.get(prof.id) || []
            
            // Sort attempts in ascending order so 'Lần 1' is the earliest
            const sortedAttempts = attempts.sort((a: any, b: any) => {
                const dateA = a.completed_at ? new Date(a.completed_at).getTime() : 0
                const dateB = b.completed_at ? new Date(b.completed_at).getTime() : 0
                return dateA - dateB
            })

            const mappedAttempts = sortedAttempts.map((attempt: any) => ({
                score: `${attempt.score}/${attempt.total_points ?? 100}`,
                examTitle: attempt.exams?.title || 'N/A',
                completedAt: attempt.completed_at ? new Date(attempt.completed_at).toLocaleString('vi-VN') : 'N/A'
            }))

            return {
                name: prof.full_name || authUser?.user_metadata?.full_name || 'Học viên',
                email: authUser?.email || '',
                groupName: prof.group_name || '',
                attempts: mappedAttempts
            }
        })

        return NextResponse.json({ data: result }, { status: 200 })
    } catch (error) {
        const message = error instanceof Error ? error.message : "Internal Server Error"
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
