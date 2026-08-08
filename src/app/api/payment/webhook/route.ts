import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

// SePay webhook payload structure (based on common Vietnamese payment gateway patterns)
interface SePayWebhookPayload {
    id: string
    gateway: string
    transaction_date: string
    account_number?: string
    sub_account?: string
    amount_in?: number
    amount_out?: number
    transferAmount?: number
    transferType?: string
    accumulated?: number
    code?: string
    transaction_content?: string
    content?: string
    reference_number?: string
    referenceCode?: string
    body?: string
}

type WebhookLogStatus =
    | 'received'
    | 'not_incoming'
    | 'no_transaction_code'
    | 'transaction_not_found'
    | 'amount_mismatch'
    | 'completed'
    | 'error'

async function writeWebhookLog(
    supabase: ReturnType<typeof createAdminClient>,
    payload: SePayWebhookPayload,
    details: {
        status: WebhookLogStatus
        amount?: number
        content?: string
        transactionCode?: string | null
        matchedTransactionId?: string | null
        message?: string
    }
) {
    const { error } = await supabase
        .from('sepay_webhook_logs')
        .insert({
            sepay_id: payload.id || null,
            gateway: payload.gateway || null,
            transaction_date: payload.transaction_date || null,
            account_number: payload.account_number || null,
            reference_number: payload.reference_number || payload.referenceCode || null,
            amount_in: details.amount || 0,
            content: details.content || payload.transaction_content || payload.content || '',
            transaction_code: details.transactionCode || null,
            matched_transaction_id: details.matchedTransactionId || null,
            status: details.status,
            message: details.message || null,
            payload
        })

    // Keep payment processing alive even if the optional audit table has not
    // been migrated yet.
    if (error) {
        console.warn('Failed to write SePay webhook log:', error.message)
    }
}

export async function POST(request: NextRequest) {
    let payload: SePayWebhookPayload | null = null
    let supabase: ReturnType<typeof createAdminClient> | null = null

    try {
        // Verify API key from SePay
        const authHeader = request.headers.get('authorization') || ''
        const xApiKey = request.headers.get('x-api-key') || ''
        
        let apiKey = xApiKey
        if (!apiKey && authHeader) {
            // Extract token regardless of prefix (Bearer, Apikey, etc.)
            const parts = authHeader.split(' ')
            apiKey = parts.length === 2 ? parts[1] : authHeader
        }

        if (!apiKey || apiKey !== process.env.SEPAY_API_KEY) {
            console.error('Invalid API key received. Expected:', process.env.SEPAY_API_KEY?.substring(0, 5) + '...', 'Got:', apiKey?.substring(0, 5) + '...')
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        payload = await request.json()
        const webhookPayload = payload as SePayWebhookPayload
        supabase = createAdminClient()

        // Support both v1 and v2 payload formats from SePay
        const amount = webhookPayload.amount_in !== undefined ? webhookPayload.amount_in : (webhookPayload.transferAmount || 0)
        const content = webhookPayload.transaction_content || webhookPayload.content || ''
        const transferType = webhookPayload.transferType || (webhookPayload.amount_in !== undefined && webhookPayload.amount_in > 0 ? 'in' : 'out')

        console.log('SePay webhook received:', {
            id: webhookPayload.id,
            amount: amount,
            content: content
        })

        // Only process incoming transfers
        if (amount <= 0 || (webhookPayload.transferType && webhookPayload.transferType.toLowerCase() !== 'in')) {
            await writeWebhookLog(supabase, webhookPayload, {
                status: 'not_incoming',
                amount,
                content,
                message: `Ignored transfer type: ${transferType}`
            })
            return NextResponse.json({ message: 'Not an incoming transfer' }, { status: 200 })
        }

        // Prefer SePay's parsed code, then fall back to extracting it from the
        // bank content for legacy transactions created before code rules were configured.
        const parsedCode = webhookPayload.code?.trim().toUpperCase() || ''
        const transactionCodeMatch = parsedCode.match(/^(SEVQR|TOPIK)[A-Z0-9]+$/i)
            || content.match(/(SEVQR|TOPIK)[A-Z0-9]+/i)
        if (!transactionCodeMatch) {
            console.log('No transaction code found in content:', content)
            await writeWebhookLog(supabase, webhookPayload, {
                status: 'no_transaction_code',
                amount,
                content,
                message: 'No SEVQR/TOPIK transaction code found in transfer content'
            })
            return NextResponse.json({ message: 'No transaction code found' }, { status: 200 })
        }

        const transactionCode = transactionCodeMatch[0].toUpperCase()
        console.log('Found transaction code:', transactionCode)

        // Find by code regardless of status. A previous webhook may have marked
        // the payment completed before its entitlement activation succeeded.
        const { data: transaction, error: findError } = await supabase
            .from('payment_transactions')
            .select('*')
            .eq('transaction_code', transactionCode)
            .single()

        if (findError || !transaction) {
            console.log('Transaction not found or not pending:', transactionCode)
            await writeWebhookLog(supabase, webhookPayload, {
                status: 'transaction_not_found',
                amount,
                content,
                transactionCode,
                message: 'No payment transaction matched this code'
            })
            return NextResponse.json({ message: 'Transaction not found' }, { status: 200 })
        }

        // Verify amount matches (allow ±1000 VND tolerance for rounding)
        const amountDiff = Math.abs(amount - transaction.amount_vnd)
        if (amountDiff > 1000) {
            console.error('Amount mismatch:', {
                expected: transaction.amount_vnd,
                received: amount,
                diff: amountDiff
            })
            await writeWebhookLog(supabase, webhookPayload, {
                status: 'amount_mismatch',
                amount,
                content,
                transactionCode,
                matchedTransactionId: transaction.id,
                message: `Expected ${transaction.amount_vnd}, received ${amount}`
            })
            return NextResponse.json({ message: 'Amount mismatch' }, { status: 200 })
        }

        const isInterviewSubscription = transaction.product_type === 'interview_subscription'
        if (isInterviewSubscription) {
            const durationDays = Number(transaction.duration_days_snapshot)
            if (!transaction.interview_plan_id || !Number.isInteger(durationDays) || durationDays <= 0) {
                throw new Error('Invalid interview subscription snapshot')
            }
            if (transaction.activation_status !== 'activated') {
                // If activation succeeded but the final payment update failed,
                // do not grant the same purchased days twice on webhook retry.
                const { data: existingGrant, error: existingGrantError } = await supabase
                    .from('user_interview_entitlements')
                    .select('id')
                    .eq('user_id', transaction.user_id)
                    .ilike('notes', `%transaction=${transaction.id}%`)
                    .maybeSingle()
                if (existingGrantError) throw existingGrantError
                if (!existingGrant) {
                    const { error: activationError } = await supabase.rpc('grant_interview_access', {
                        p_user_id: transaction.user_id,
                        p_plan_id: transaction.interview_plan_id,
                        p_days: durationDays,
                        p_source: 'sepay',
                        p_performed_by: null,
                        p_notes: `SePay ${transactionCode}; transaction=${transaction.id}`
                    })
                    if (activationError) throw activationError
                }
            }
        } else {
            if (transaction.payment_status === 'completed') {
                return NextResponse.json({ success: true, message: 'Payment already processed' })
            }
            const { error: creditError } = await supabase.rpc('increment_user_credits', {
                p_user_id: transaction.user_id,
                p_credits: transaction.credits_purchased
            })
            if (creditError) throw creditError
        }

        // Mark the payment completed only after the purchased benefit has been
        // delivered. This keeps failed activations recoverable by webhook retry.
        const { error: updateError } = await supabase
            .from('payment_transactions')
            .update({
                payment_status: 'completed',
                activation_status: isInterviewSubscription ? 'activated' : transaction.activation_status,
                verified_at: new Date().toISOString(),
                notes: `Auto-approved via SePay webhook. Transfer ID: ${webhookPayload.id}`
            })
            .eq('id', transaction.id)
        if (updateError) throw updateError

        console.log('Successfully processed payment:', {
            transactionCode,
            userId: transaction.user_id,
            productType: transaction.product_type || 'exam_credit'
        })

        await writeWebhookLog(supabase, webhookPayload, {
            status: 'completed',
            amount,
            content,
            transactionCode,
            matchedTransactionId: transaction.id,
            message: isInterviewSubscription
                ? `Activated interview access for ${transaction.duration_days_snapshot} days`
                : `Added ${transaction.credits_purchased} credits`
        })

        return NextResponse.json({
            success: true,
            message: 'Payment processed successfully'
        })
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Webhook processing failed'
        console.error('Webhook processing error:', error)
        if (payload && supabase) {
            await writeWebhookLog(supabase, payload, {
                status: 'error',
                message
            })
        }
        // A processing error must be retried by SePay. Returning 200 here used
        // to leave paid transactions permanently without their purchased access.
        return NextResponse.json(
            { error: message },
            { status: 500 }
        )
    }
}
