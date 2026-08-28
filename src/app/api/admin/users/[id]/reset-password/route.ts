import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { recordAdminUserActivity } from '@/lib/admin-user-audit'

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const { id: targetUserId } = await context.params
        const supabase = await createClient()
        const { data: { user: actor } } = await supabase.auth.getUser()
        if (!actor) return NextResponse.json({ error: 'Bạn chưa đăng nhập.' }, { status: 401 })

        const { data: actorProfile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', actor.id)
            .single()
        if (actorProfile?.role !== 'admin') {
            return NextResponse.json({ error: 'Chỉ quản trị viên được gửi email đặt lại mật khẩu.' }, { status: 403 })
        }

        const admin = createAdminClient()
        const { data: targetData, error: targetError } = await admin.auth.admin.getUserById(targetUserId)
        if (targetError || !targetData.user?.email) {
            return NextResponse.json({ error: 'Không tìm thấy tài khoản hoặc tài khoản chưa có email.' }, { status: 404 })
        }

        const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
        const requestOrigin = new URL(request.url).origin
        const callback = new URL('/api/auth/callback', configuredSiteUrl || requestOrigin)
        callback.searchParams.set('next', '/reset-password')

        const { error: resetError } = await admin.auth.resetPasswordForEmail(targetData.user.email, {
            redirectTo: callback.toString(),
        })
        if (resetError) return NextResponse.json({ error: resetError.message }, { status: 400 })

        await recordAdminUserActivity({
            targetUserId,
            actor,
            actorRole: actorProfile.role,
            action: 'password_recovery_sent',
            label: 'Gửi email đặt lại mật khẩu',
            details: { delivery: 'email' },
        })

        return NextResponse.json({ success: true })
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Không thể gửi email đặt lại mật khẩu.'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
