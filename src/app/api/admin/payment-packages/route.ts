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
            .from('payment_packages')
            .select('*')
            .order('display_order', { ascending: true })

        if (error) throw error
        return NextResponse.json({ success: true, data })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const user = await checkAdmin(supabase)
        if (!user) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const body = await request.json()
        const { package_name, credits, price_vnd, display_order, is_active } = body

        if (!package_name || !credits || price_vnd == null) {
            return NextResponse.json({ success: false, error: 'Thiếu thông tin bắt buộc' }, { status: 400 })
        }

        const admin = createAdminClient()
        const { data, error } = await admin
            .from('payment_packages')
            .insert({
                package_name,
                credits: Number(credits),
                price_vnd: Number(price_vnd),
                display_order: Number(display_order || 0),
                is_active: is_active !== false
            })
            .select()
            .single()

        if (error) throw error
        return NextResponse.json({ success: true, data })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
