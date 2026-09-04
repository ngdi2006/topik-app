import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface SupabaseErrorLike {
    code?: string
    message?: string
}

async function checkAdmin() {
    const supabase = await createClient()
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

export async function GET(request: NextRequest) {
    try {
        const user = await checkAdmin()
        if (!user) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status')
        const limit = Math.min(Number(searchParams.get('limit') || 100), 200)

        const admin = createAdminClient()
        let query = admin
            .from('sepay_webhook_logs')
            .select(`
                id,
                sepay_id,
                gateway,
                transaction_date,
                account_number,
                reference_number,
                amount_in,
                content,
                transaction_code,
                matched_transaction_id,
                status,
                message,
                created_at
            `)
            .order('created_at', { ascending: false })
            .limit(limit)

        if (status && status !== 'all') {
            query = query.eq('status', status)
        }

        const { data, error } = await query
        if (error) {
            const supabaseError = error as SupabaseErrorLike
            const message = supabaseError.message || ''
            const isMissingLogTable =
                supabaseError.code === '42P01' ||
                supabaseError.code === 'PGRST205' ||
                message.includes('sepay_webhook_logs')

            if (isMissingLogTable) {
                return NextResponse.json({
                    success: true,
                    data: [],
                    migrationRequired: true,
                    message: 'Chưa tạo bảng sepay_webhook_logs. Hãy chạy migration supabase/migrations/20260720_add_sepay_webhook_logs.sql trong Supabase SQL Editor.'
                })
            }

            throw error
        }

        return NextResponse.json({ success: true, data })
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to fetch SePay logs'
        return NextResponse.json(
            { success: false, error: message },
            { status: 500 }
        )
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const user = await checkAdmin()
        if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

        const body = await request.json().catch(() => null) as { id?: string; note?: string } | null
        const id = body?.id?.trim()
        const note = body?.note?.trim().slice(0, 300)
        if (!id) return NextResponse.json({ error: 'Thiếu mã bản ghi SePay' }, { status: 400 })

        const admin = createAdminClient()
        const { data: log, error: findError } = await admin
            .from('sepay_webhook_logs')
            .select('id, status, message, amount_in')
            .eq('id', id)
            .single()
        if (findError || !log) return NextResponse.json({ error: 'Không tìm thấy giao dịch' }, { status: 404 })
        if (log.status === 'completed') return NextResponse.json({ success: true, data: log })
        if (Number(log.amount_in) <= 0) return NextResponse.json({ error: 'Chỉ có thể đối soát giao dịch tiền vào' }, { status: 400 })

        const reconciledAt = new Date().toISOString()
        const auditMessage = [
            `[MANUAL_RECONCILED] ${reconciledAt}`,
            `Người xử lý: ${user.email || user.id}`,
            note ? `Ghi chú: ${note}` : null,
            log.message ? `Trạng thái trước: ${log.message}` : null,
        ].filter(Boolean).join(' · ')

        // Closing a reconciliation log must never grant access or add credits.
        // It only records the administrator's review decision.
        const { data, error } = await admin
            .from('sepay_webhook_logs')
            .update({ status: 'completed', message: auditMessage })
            .eq('id', id)
            .neq('status', 'completed')
            .select('id, status, message')
            .single()
        if (error) throw error

        return NextResponse.json({ success: true, data })
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Không thể đánh dấu đã đối soát'
        return NextResponse.json({ success: false, error: message }, { status: 500 })
    }
}
