import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const BANK_BINS: Record<string, string> = {
  MB: '970422', VCB: '970436', TCB: '970407', ACB: '970416', BIDV: '970418',
  VPB: '970432', TPB: '970423', VIETINBANK: '970415', MSB: '970426', OCB: '970448',
}

function getBankConfig() {
  const bankCode = process.env.SEPAY_BANK_CODE?.trim().toUpperCase()
  const bankId = process.env.SEPAY_BANK_BIN?.trim() || BANK_BINS[bankCode || '']
  const accountNo = process.env.SEPAY_ACCOUNT_NUMBER?.trim()
  const accountName = process.env.SEPAY_ACCOUNT_NAME?.trim()
  if (!bankId || !accountNo || !accountName) throw new Error('Missing SePay bank configuration')
  return { bankId, bankCode: bankCode || bankId, accountNo, accountName }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Vui lòng đăng nhập' }, { status: 401 })

    const { plan_id } = await request.json()
    if (!plan_id) return NextResponse.json({ error: 'Thiếu gói đăng ký' }, { status: 400 })

    const { data: plan, error: planError } = await supabase
      .from('interview_subscription_plans')
      .select('id, code, name, duration_days, price_vnd')
      .eq('id', plan_id)
      .eq('is_active', true)
      .single()
    if (planError || !plan) return NextResponse.json({ error: 'Gói không tồn tại' }, { status: 404 })

    const bank = getBankConfig()
    const recentThreshold = new Date(Date.now() - 30 * 60 * 1000).toISOString()
    const { data: recentTransactions } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('user_id', user.id)
      .eq('product_type', 'interview_subscription')
      .eq('interview_plan_id', plan.id)
      .in('payment_status', ['pending', 'completed'])
      .gte('created_at', recentThreshold)
      .order('created_at', { ascending: false })
      .limit(5)
    const unresolvedTransaction = (recentTransactions || []).find((item) =>
      item.payment_status === 'pending' || item.activation_status !== 'activated'
    )
    if (unresolvedTransaction) {
      return NextResponse.json({
        transaction: unresolvedTransaction,
        qr_code_url: unresolvedTransaction.qr_code_url,
        bank_info: {
          bank_name: bank.bankCode,
          account_no: bank.accountNo,
          account_name: bank.accountName,
          amount: unresolvedTransaction.amount_vnd,
          content: unresolvedTransaction.transaction_code,
        },
      })
    }

    // SePay payment-code rules: prefix 2–5 letters, followed by at most
    // 10 alphanumeric characters. Keeping this canonical format lets SePay
    // populate its dedicated `code` field instead of only preserving content.
    const transactionCode = `SEVQR${crypto.randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase()}`
    const qrCodeUrl = `https://img.vietqr.io/image/${bank.bankId}-${bank.accountNo}-compact2.png?amount=${plan.price_vnd}&addInfo=${transactionCode}&accountName=${encodeURIComponent(bank.accountName)}`

    const { data: transaction, error } = await supabase.from('payment_transactions').insert({
      user_id: user.id,
      package_id: null,
      transaction_code: transactionCode,
      amount_vnd: plan.price_vnd,
      credits_purchased: 0,
      payment_method: 'bank_transfer',
      payment_status: 'pending',
      qr_code_url: qrCodeUrl,
      product_type: 'interview_subscription',
      interview_plan_id: plan.id,
      duration_days_snapshot: plan.duration_days,
      package_name_snapshot: plan.name,
      activation_status: 'pending',
    }).select().single()
    if (error) throw error

    return NextResponse.json({
      transaction,
      qr_code_url: qrCodeUrl,
      bank_info: {
        bank_name: bank.bankCode,
        account_no: bank.accountNo,
        account_name: bank.accountName,
        amount: plan.price_vnd,
        content: transactionCode,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Không thể tạo giao dịch'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
