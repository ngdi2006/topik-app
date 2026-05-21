import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// Admin: Get all pending transactions
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Check admin role
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!profile || !['admin', 'teacher'].includes(profile.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status') || 'pending'

        const { data: transactions, error } = await supabase
            .from('payment_transactions')
            .select(`
                *,
                profiles:user_id (
                    id,
                    full_name,
                    email
                ),
                payment_packages (
                    package_name,
                    credits,
                    price_vnd
                )
            `)
            .eq('payment_status', status)
            .order('created_at', { ascending: false })

        if (error) throw error

        return NextResponse.json(transactions)
    } catch (error: any) {
        console.error('Error fetching transactions:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to fetch transactions' },
            { status: 500 }
        )
    }
}

// Admin: Approve a transaction and add credits
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Check admin role
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!profile || !['admin', 'teacher'].includes(profile.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const body = await request.json()
        const { transaction_id, action, notes } = body

        if (!transaction_id || !action) {
            return NextResponse.json({ error: 'transaction_id and action are required' }, { status: 400 })
        }

        if (!['approve', 'reject'].includes(action)) {
            return NextResponse.json({ error: 'action must be approve or reject' }, { status: 400 })
        }

        // Get transaction
        const { data: transaction, error: txError } = await supabase
            .from('payment_transactions')
            .select('*')
            .eq('id', transaction_id)
            .single()

        if (txError || !transaction) {
            return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
        }

        if (transaction.payment_status !== 'pending') {
            return NextResponse.json(
                { error: 'Transaction is not in pending status' },
                { status: 400 }
            )
        }

        if (action === 'approve') {
            // Update transaction status
            const { error: updateError } = await supabase
                .from('payment_transactions')
                .update({
                    payment_status: 'completed',
                    verified_at: new Date().toISOString(),
                    verified_by: user.id,
                    notes
                })
                .eq('id', transaction_id)

            if (updateError) throw updateError

            // Add credits to user using the increment function
            const { error: creditError } = await supabase.rpc('increment_user_credits', {
                p_user_id: transaction.user_id,
                p_credits: transaction.credits_purchased
            })

            if (creditError) throw creditError

            return NextResponse.json({
                success: true,
                message: `Đã duyệt thanh toán và cộng ${transaction.credits_purchased} lượt cho người dùng`
            })
        } else {
            // Reject transaction
            const { error: updateError } = await supabase
                .from('payment_transactions')
                .update({
                    payment_status: 'failed',
                    verified_at: new Date().toISOString(),
                    verified_by: user.id,
                    notes
                })
                .eq('id', transaction_id)

            if (updateError) throw updateError

            return NextResponse.json({
                success: true,
                message: 'Đã từ chối giao dịch'
            })
        }
    } catch (error: any) {
        console.error('Error processing transaction:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to process transaction' },
            { status: 500 }
        )
    }
}
