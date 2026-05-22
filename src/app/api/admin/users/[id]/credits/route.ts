import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const resolvedParams = await context.params
        const userId = resolvedParams.id
        const body = await request.json()
        const credits = Number(body.credits)
        const notes = typeof body.notes === 'string' ? body.notes.trim() : ''

        if (!Number.isInteger(credits) || credits <= 0) {
            return NextResponse.json({ error: 'Số lượt cộng phải là số nguyên dương' }, { status: 400 })
        }

        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!profile || profile.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const adminClient = createAdminClient()
        const { error: creditError } = await adminClient.rpc('increment_user_credits', {
            p_user_id: userId,
            p_credits: credits,
        })

        if (creditError) {
            return NextResponse.json({ error: creditError.message }, { status: 500 })
        }

        const { data: creditRow, error: fetchError } = await adminClient
            .from('user_exam_credits')
            .select('total_credits, used_credits, remaining_credits')
            .eq('user_id', userId)
            .single()

        if (fetchError) {
            return NextResponse.json({ error: fetchError.message }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            message: `Đã cộng ${credits} lượt cho người dùng`,
            notes,
            credits: creditRow,
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal Server Error'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
