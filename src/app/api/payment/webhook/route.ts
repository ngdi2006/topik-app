import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

// SePay webhook payload structure (based on common Vietnamese payment gateway patterns)
interface SePayWebhookPayload {
    id: string
    gateway: string
    transaction_date: string
    account_number: string
    sub_account?: string
    amount_in: number
    amount_out: number
    accumulated: number
    code: string
    transaction_content: string
    reference_number: string
    body: string
}

export async function POST(request: NextRequest) {
    try {
        // Verify API key from SePay
        const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '')

        if (!apiKey || apiKey !== process.env.SEPAY_API_KEY) {
            console.error('Invalid API key')
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const payload: SePayWebhookPayload = await request.json()

        console.log('SePay webhook received:', {
            id: payload.id,
            amount: payload.amount_in,
            content: payload.transaction_content
        })

        // Only process incoming transfers
        if (payload.amount_in <= 0) {
            return NextResponse.json({ message: 'Not an incoming transfer' }, { status: 200 })
        }

        // Extract transaction code from content (format: SEVQRXXXXXXXXXX or TOPIKXXXXXXXXXX)
        const transactionCodeMatch = payload.transaction_content.match(/(SEVQR|TOPIK)[A-Z0-9]+/i)
        if (!transactionCodeMatch) {
            console.log('No transaction code found in content:', payload.transaction_content)
            return NextResponse.json({ message: 'No transaction code found' }, { status: 200 })
        }

        const transactionCode = transactionCodeMatch[0].toUpperCase()
        console.log('Found transaction code:', transactionCode)

        // Use service role to bypass RLS
        const supabase = createAdminClient()

        // Find matching pending transaction
        const { data: transaction, error: findError } = await supabase
            .from('payment_transactions')
            .select('*')
            .eq('transaction_code', transactionCode)
            .eq('payment_status', 'pending')
            .single()

        if (findError || !transaction) {
            console.log('Transaction not found or not pending:', transactionCode)
            return NextResponse.json({ message: 'Transaction not found' }, { status: 200 })
        }

        // Verify amount matches (allow ±1000 VND tolerance for rounding)
        const amountDiff = Math.abs(payload.amount_in - transaction.amount_vnd)
        if (amountDiff > 1000) {
            console.error('Amount mismatch:', {
                expected: transaction.amount_vnd,
                received: payload.amount_in,
                diff: amountDiff
            })
            return NextResponse.json({ message: 'Amount mismatch' }, { status: 200 })
        }

        console.log('Auto-approving transaction:', transactionCode)

        // Update transaction status
        const { error: updateError } = await supabase
            .from('payment_transactions')
            .update({
                payment_status: 'completed',
                verified_at: new Date().toISOString(),
                notes: `Auto-approved via SePay webhook. Transfer ID: ${payload.id}`
            })
            .eq('id', transaction.id)

        if (updateError) {
            console.error('Failed to update transaction:', updateError)
            throw updateError
        }

        // Add credits to user
        const { error: creditError } = await supabase.rpc('increment_user_credits', {
            p_user_id: transaction.user_id,
            p_credits: transaction.credits_purchased
        })

        if (creditError) {
            console.error('Failed to increment credits:', creditError)
            throw creditError
        }

        console.log('Successfully processed payment:', {
            transactionCode,
            userId: transaction.user_id,
            credits: transaction.credits_purchased
        })

        return NextResponse.json({
            success: true,
            message: 'Payment processed successfully'
        })
    } catch (error: any) {
        console.error('Webhook processing error:', error)
        // Return 200 to prevent SePay from retrying
        return NextResponse.json(
            { error: error.message || 'Webhook processing failed' },
            { status: 200 }
        )
    }
}
