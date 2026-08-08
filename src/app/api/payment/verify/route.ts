import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { transaction_code } = body

        if (!transaction_code) {
            return NextResponse.json({ error: 'Transaction code is required' }, { status: 400 })
        }

        // Get transaction
        const { data: transaction, error: txError } = await supabase
            .from('payment_transactions')
            .select('*')
            .eq('transaction_code', transaction_code)
            .eq('user_id', user.id)
            .single()

        if (txError || !transaction) {
            return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
        }

        if (transaction.payment_status === 'completed' && transaction.product_type === 'interview_subscription' && transaction.activation_status !== 'activated') {
            const durationDays = Number(transaction.duration_days_snapshot)
            if (!transaction.interview_plan_id || !Number.isInteger(durationDays) || durationDays <= 0) {
                return NextResponse.json({ error: 'Giao dịch thiếu thông tin gói Vòng 2' }, { status: 409 })
            }
            const admin = createAdminClient()
            const { data: existingGrant, error: grantLookupError } = await admin
                .from('user_interview_entitlements')
                .select('id')
                .eq('user_id', user.id)
                .ilike('notes', `%transaction=${transaction.id}%`)
                .maybeSingle()
            if (grantLookupError) throw grantLookupError
            if (!existingGrant) {
                const { error: activationError } = await admin.rpc('grant_interview_access', {
                    p_user_id: user.id,
                    p_plan_id: transaction.interview_plan_id,
                    p_days: durationDays,
                    p_source: 'sepay',
                    p_performed_by: null,
                    p_notes: `SePay recovery ${transaction.transaction_code}; transaction=${transaction.id}`,
                })
                if (activationError) throw activationError
            }
            const { error: updateError } = await admin
                .from('payment_transactions')
                .update({ activation_status: 'activated' })
                .eq('id', transaction.id)
            if (updateError) throw updateError
        }

        if (transaction.payment_status === 'completed') {
            return NextResponse.json({
                message: 'Transaction already completed',
                status: 'completed',
                activation_status: transaction.product_type === 'interview_subscription' ? 'activated' : transaction.activation_status,
            })
        }

        // In production, this would check with bank API
        // For now, return pending status
        return NextResponse.json({
            transaction,
            status: transaction.payment_status,
            message: 'Đang chờ xác nhận thanh toán. Vui lòng liên hệ admin để kích hoạt.'
        })
    } catch (error: unknown) {
        console.error('Error verifying payment:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to verify payment' },
            { status: 500 }
        )
    }
}
