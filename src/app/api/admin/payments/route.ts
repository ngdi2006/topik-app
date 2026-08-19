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
    product_type?: string | null
    interview_plan_id?: string | null
    duration_days_snapshot?: number | null
    activation_status?: string | null
    payment_packages: PaymentPackageSummary | null
}

interface ProfileSummary {
    id: string
    full_name: string | null
}

interface WebhookLogSummary {
    id: string
    amount_in: number
    content: string
    status: string
    message: string | null
    reference_number: string | null
    created_at: string
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

        if (searchParams.get('summary') === 'attention') {
            const [pendingResult, logsResult] = await Promise.all([
                adminClient
                    .from('payment_transactions')
                    .select('transaction_code')
                    .eq('payment_status', 'pending'),
                adminClient
                    .from('sepay_webhook_logs')
                    .select('amount_in, content')
                    .neq('status', 'completed')
                    .gt('amount_in', 0)
                    .order('created_at', { ascending: false })
                    .limit(300)
            ])

            if (pendingResult.error) throw pendingResult.error
            if (logsResult.error) {
                return NextResponse.json({ attention_count: 0 })
            }

            const paidContents = (logsResult.data || []).map((log) => log.content.toUpperCase())
            const attentionCount = (pendingResult.data || []).reduce((count, transaction) => (
                paidContents.some((content) => content.includes(transaction.transaction_code.toUpperCase()))
                    ? count + 1
                    : count
            ), 0)

            return NextResponse.json({ attention_count: attentionCount })
        }

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

        const [profilesResult, webhookLogsResult] = await Promise.all([
            userIds.length > 0
                ? adminClient.from('profiles').select('id, full_name').in('id', userIds)
                : Promise.resolve({ data: [], error: null }),
            status === 'pending'
                ? adminClient
                    .from('sepay_webhook_logs')
                    .select('id, amount_in, content, status, message, reference_number, created_at')
                    .neq('status', 'completed')
                    .order('created_at', { ascending: false })
                    .limit(300)
                : Promise.resolve({ data: [], error: null })
        ])

        const { data: profiles, error: profilesError } = profilesResult

        if (profilesError) throw profilesError

        // The audit table is optional on older environments. Payment management
        // must remain available even when that migration has not been applied.
        const webhookLogs = webhookLogsResult.error
            ? []
            : (webhookLogsResult.data || []) as WebhookLogSummary[]

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
            const webhookIssue = webhookLogs.find((log) =>
                log.amount_in > 0 &&
                log.content.toUpperCase().includes(tx.transaction_code.toUpperCase())
            )

            return {
                ...tx,
                profiles: {
                    id: tx.user_id,
                    full_name: userProfile?.full_name || 'Học viên',
                    email: emailByUserId.get(tx.user_id) || ''
                },
                webhook_issue: webhookIssue || null
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

        const adminClient = createAdminClient()

        const body = await request.json()
        const { transaction_id, action, notes } = body

        if (!transaction_id || !action) {
            return NextResponse.json({ error: 'transaction_id and action are required' }, { status: 400 })
        }

        if (!['approve', 'reject'].includes(action)) {
            return NextResponse.json({ error: 'action must be approve or reject' }, { status: 400 })
        }

        // Get transaction
        const { data: transaction, error: txError } = await adminClient
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
            const isInterviewSubscription = transaction.product_type === 'interview_subscription'

            if (isInterviewSubscription) {
                const durationDays = Number(transaction.duration_days_snapshot)
                if (!transaction.interview_plan_id || !Number.isInteger(durationDays) || durationDays <= 0) {
                    return NextResponse.json({ error: 'Giao dịch thiếu thông tin gói phỏng vấn' }, { status: 400 })
                }

                const { data: existingGrant, error: existingGrantError } = await adminClient
                    .from('user_interview_entitlements')
                    .select('id')
                    .eq('user_id', transaction.user_id)
                    .ilike('notes', `%transaction=${transaction.id}%`)
                    .maybeSingle()
                if (existingGrantError) throw existingGrantError

                if (!existingGrant) {
                    const { error: activationError } = await adminClient.rpc('grant_interview_access', {
                        p_user_id: transaction.user_id,
                        p_plan_id: transaction.interview_plan_id,
                        p_days: durationDays,
                        p_source: 'sepay',
                        p_performed_by: user.id,
                        p_notes: `Admin reconciliation ${transaction.transaction_code}; transaction=${transaction.id}`
                    })
                    if (activationError) throw activationError
                }
            } else {
                const { error: creditError } = await adminClient.rpc('increment_user_credits', {
                    p_user_id: transaction.user_id,
                    p_credits: transaction.credits_purchased
                })
                if (creditError) throw creditError
            }

            const { error: updateError } = await adminClient
                .from('payment_transactions')
                .update({
                    payment_status: 'completed',
                    activation_status: isInterviewSubscription ? 'activated' : transaction.activation_status,
                    verified_at: new Date().toISOString(),
                    verified_by: user.id,
                    notes: notes || 'Đối soát và kích hoạt thủ công từ trang quản trị'
                })
                .eq('id', transaction_id)
            if (updateError) throw updateError

            return NextResponse.json({
                success: true,
                message: isInterviewSubscription
                    ? `Đã kích hoạt gói phỏng vấn ${transaction.duration_days_snapshot} ngày`
                    : `Đã duyệt thanh toán và cộng ${transaction.credits_purchased} lượt cho người dùng`
            })
        } else {
            // Reject transaction
            const { error: updateError } = await adminClient
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
