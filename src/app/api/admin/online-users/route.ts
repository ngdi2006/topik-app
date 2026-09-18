import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const bodySchema = z.object({
    userIds: z.array(z.string().uuid()).max(50),
})

export async function POST(request: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: actor } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (actor?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const parsed = bodySchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: 'Danh sách người dùng không hợp lệ.' }, { status: 400 })

    const userIds = [...new Set(parsed.data.userIds)]
    if (!userIds.length) return NextResponse.json({ users: [] })

    const admin = createAdminClient()
    const [{ data: profiles }, authResults] = await Promise.all([
        admin.from('profiles').select('id,full_name,role,group_name').in('id', userIds),
        Promise.all(userIds.map((id) => admin.auth.admin.getUserById(id))),
    ])
    const profilesById = new Map((profiles || []).map((profile) => [profile.id, profile]))

    return NextResponse.json({
        users: authResults.flatMap(({ data }) => {
            if (!data.user) return []
            const profile = profilesById.get(data.user.id)
            return [{
                id: data.user.id,
                name: profile?.full_name || data.user.user_metadata?.full_name || data.user.email || 'Học viên',
                email: data.user.email || null,
                role: profile?.role || 'learner',
                groupName: profile?.group_name || null,
            }]
        }),
    })
}
