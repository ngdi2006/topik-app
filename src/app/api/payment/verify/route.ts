import { createClient } from '@/lib/supabase/server'
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

        if (transaction.payment_status === 'completed') {
            return NextResponse.json({
                message: 'Transaction already completed',
                status: 'completed'
            })
        }

        // In production, this would check with bank API
        // For now, return pending status
        return NextResponse.json({
            transaction,
            status: transaction.payment_status,
            message: 'Đang chờ xác nhận thanh toán. Vui lòng liên hệ admin để kích hoạt.'
        })
    } catch (error: any) {
        console.error('Error verifying payment:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to verify payment' },
            { status: 500 }
        )
    }
}
