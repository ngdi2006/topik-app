import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const BANK_CODES: Record<string, string> = {
    'MB': '970422',
    'VCB': '970436',
    'TCB': '970407',
    'ACB': '970416',
    'BIDV': '970418',
    'VPB': '970432',
    'TPB': '970423',
    'STB': '970403',
    'HDB': '970437',
    'MSB': '970426',
    'SHB': '970443',
    'VIB': '970441',
    'VIETINBANK': '970415',
    'OCB': '970448',
    'KIENLONGBANK': '970452',
    'SACOMBANK': '970403',
}

const BANK_NAMES: Record<string, string> = {
    'MB': 'MB Bank',
    'VCB': 'Vietcombank',
    'TCB': 'Techcombank',
    'ACB': 'ACB',
    'BIDV': 'BIDV',
    'VPB': 'VPBank',
    'TPB': 'TPBank',
    'VIETINBANK': 'VietinBank',
    'MSB': 'MSB',
    'OCB': 'OCB',
}

function getBankConfig() {
    const bankCode = process.env.SEPAY_BANK_CODE?.trim().toUpperCase()
    const bankBin = process.env.SEPAY_BANK_BIN?.trim()
    const accountNo = process.env.SEPAY_ACCOUNT_NUMBER?.trim()
    const accountName = process.env.SEPAY_ACCOUNT_NAME?.trim()

    if ((!bankCode && !bankBin) || !accountNo || !accountName) {
        throw new Error('Missing SePay bank configuration')
    }

    const bankId = bankBin || BANK_CODES[bankCode || '']
    if (!bankId) {
        throw new Error(`Unsupported SePay bank code: ${bankCode}`)
    }

    return {
        bankCode: bankCode || bankId,
        bankId,
        bankName: bankCode ? (BANK_NAMES[bankCode] || bankCode) : bankId,
        accountNo,
        accountName
    }
}

function generateBankQR(amount: number, transactionCode: string, bankConfig: ReturnType<typeof getBankConfig>) {
    const accountName = encodeURIComponent(bankConfig.accountName)

    return `https://img.vietqr.io/image/${bankConfig.bankId}-${bankConfig.accountNo}-compact2.png?amount=${amount}&addInfo=${transactionCode}&accountName=${accountName}`
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { package_id } = body

        if (!package_id) {
            return NextResponse.json({ error: 'Package ID is required' }, { status: 400 })
        }

        // Get package details
        const { data: pkg, error: pkgError } = await supabase
            .from('payment_packages')
            .select('*')
            .eq('id', package_id)
            .eq('is_active', true)
            .single()

        if (pkgError || !pkg) {
            return NextResponse.json({ error: 'Package not found' }, { status: 404 })
        }

        const bankConfig = getBankConfig()

        // Generate unique transaction code (must start with SEVQR for VietinBank API)
        const transactionCode = `SEVQR${Date.now()}${Math.random().toString(36).substring(2, 7).toUpperCase()}`

        // Generate QR code
        const qrCodeUrl = generateBankQR(pkg.price_vnd, transactionCode, bankConfig)

        // Create transaction record
        const { data: transaction, error: txError } = await supabase
            .from('payment_transactions')
            .insert({
                user_id: user.id,
                package_id: pkg.id,
                transaction_code: transactionCode,
                amount_vnd: pkg.price_vnd,
                credits_purchased: pkg.credits,
                payment_method: 'bank_transfer',
                payment_status: 'pending',
                qr_code_url: qrCodeUrl
            })
            .select()
            .single()

        if (txError) throw txError

        return NextResponse.json({
            transaction,
            qr_code_url: qrCodeUrl,
            bank_info: {
                bank_name: bankConfig.bankName,
                account_no: bankConfig.accountNo,
                account_name: bankConfig.accountName,
                amount: pkg.price_vnd,
                content: transactionCode
            }
        })
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to create payment'
        console.error('Error creating payment:', error)
        return NextResponse.json(
            { error: message },
            { status: 500 }
        )
    }
}
