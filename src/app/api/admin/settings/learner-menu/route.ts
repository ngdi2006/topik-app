import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'



async function checkAdmin(supabase: any) {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return null

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!profile || !['admin', 'teacher', 'supporter'].includes(profile.role)) return null
    return user
}

export async function GET() {
    try {
        const supabase = await createClient()
        const user = await checkAdmin(supabase)
        if (!user) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const admin = createAdminClient()
        const { data, error } = await admin
            .from('learner_dashboard_menu_settings')
            .select('*')
            .order('sort_order', { ascending: true })

        if (error) throw error

        return NextResponse.json({ success: true, data })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch learner menu settings'
        return NextResponse.json({ success: false, error: message }, { status: 500 })
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const supabase = await createClient()
        const user = await checkAdmin(supabase)
        if (!user) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const body = await request.json()
        const items = Array.isArray(body?.items) ? body.items : null

        if (!items || items.length === 0) {
            return NextResponse.json({ success: false, error: 'Danh sách cập nhật không hợp lệ' }, { status: 400 })
        }

        const admin = createAdminClient()

        for (const item of items) {
            const { error } = await admin
                .from('learner_dashboard_menu_settings')
                .update({ is_enabled: Boolean(item.is_enabled) })
                .eq('key', String(item.key))

            if (error) throw error
        }

        const { data, error: fetchError } = await admin
            .from('learner_dashboard_menu_settings')
            .select('*')
            .order('sort_order', { ascending: true })

        if (fetchError) throw fetchError

        return NextResponse.json({ success: true, data })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to update learner menu settings'
        return NextResponse.json({ success: false, error: message }, { status: 500 })
    }
}
