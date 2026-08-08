import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

interface PaymentPackageSummary {
    package_name: string
    credits: number
    price_vnd: number
}

interface PaymentTransactionRow {
    id: string
    transaction_code: string
    user_id: string
    package_id: string | null
    amount_vnd: number
    credits_purchased: number
    payment_status: string
    payment_method?: string
    qr_code_url?: string | null
    payment_proof_url?: string | null
    verified_at?: string | null
    verified_by?: string | null
    notes?: string | null
    created_at: string
    updated_at?: string
    payment_packages: PaymentPackageSummary | null
}

interface ProfileSummary {
    id: string
    full_name: string | null
}

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
        const adminClient = createAdminClient()

        const { data: transactions, error } = await adminClient
            .from('payment_transactions')
            .select(`
                *,
                payment_packages (
                    package_name,
                    credits,
                    price_vnd
                )
            `)
            .eq('payment_status', status)
            .order('created_at', { ascending: false })

        if (error) throw error

        const transactionRows = (transactions || []) as PaymentTransactionRow[]
        const userIds = Array.from(new Set(transactionRows.map((tx) => tx.user_id)))

        const { data: profiles, error: profilesError } = userIds.length > 0
            ? await adminClient
                .from('profiles')
                .select('id, full_name')
                .in('id', userIds)
            : { data: [], error: null }

        if (profilesError) throw profilesError

        const profileByUserId = new Map(
            ((profiles || []) as ProfileSummary[]).map((profileRow) => [profileRow.id, profileRow])
        )

        const authUsers = await Promise.all(
            userIds.map(async (userId) => {
                const { data, error } = await adminClient.auth.admin.getUserById(userId)
                if (error) {
                    console.warn('Failed to fetch payment user email:', userId, error.message)
                    return { id: userId, email: null }
                }

                return { id: userId, email: data.user?.email || null }
            })
        )
        const emailByUserId = new Map(authUsers.map((authUser) => [authUser.id, authUser.email]))

        const transactionsWithEmail = transactionRows.map((tx) => {
            const userProfile = profileByUserId.get(tx.user_id)

            return {
            ...tx,
            profiles: {
                id: tx.user_id,
                full_name: userProfile?.full_name || 'Hoc vien',
                email: emailByUserId.get(tx.user_id) || ''
            }
        }
        })

        return NextResponse.json(transactionsWithEmail)
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to fetch transactions'
        console.error('Error fetching transactions:', error)
        return NextResponse.json(
            { error: message },
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
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to process transaction'
        console.error('Error processing transaction:', error)
        return NextResponse.json(
            { error: message },
            { status: 500 }
        )
    }
}
