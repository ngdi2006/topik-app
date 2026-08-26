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

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const supabase = await createClient()
        const user = await checkAdmin(supabase)
        if (!user) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const { id } = await params
        const body = await request.json()
        const { package_name, credits, price_vnd, display_order, is_active } = body

        const admin = createAdminClient()
        const { data, error } = await admin
            .from('payment_packages')
            .update({
                package_name,
                credits: Number(credits),
                price_vnd: Number(price_vnd),
                display_order: Number(display_order || 0),
                is_active
            })
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        return NextResponse.json({ success: true, data })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const supabase = await createClient()
        const user = await checkAdmin(supabase)
        if (!user) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const { id } = await params
        const admin = createAdminClient()

        const { count } = await admin
            .from('payment_transactions')
            .select('id', { count: 'exact', head: true })
            .eq('package_id', id)

        if (count && count > 0) {
            return NextResponse.json({
                success: false,
                error: `Gói này đã có ${count} giao dịch. Hãy tắt trạng thái thay vì xóa.`
            }, { status: 400 })
        }

        const { error } = await admin
            .from('payment_packages')
            .delete()
            .eq('id', id)

        if (error) throw error
        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
