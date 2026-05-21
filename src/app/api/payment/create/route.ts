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

function generateBankQR(amount: number, transactionCode: string) {
    const bankCode = process.env.SEPAY_BANK_CODE || 'MB'
    const bankId = BANK_CODES[bankCode] || '970422'
    const accountNo = process.env.SEPAY_ACCOUNT_NUMBER || '0123456789'
    const accountName = encodeURIComponent(process.env.SEPAY_ACCOUNT_NAME || 'KOREA LINK')

    return `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=${amount}&addInfo=${transactionCode}&accountName=${accountName}`
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

        // Generate unique transaction code (must start with SEVQR for VietinBank API)
        const transactionCode = `SEVQR${Date.now()}${Math.random().toString(36).substring(2, 7).toUpperCase()}`

        // Generate QR code
        const qrCodeUrl = generateBankQR(pkg.price_vnd, transactionCode)

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
        const bankCode = process.env.SEPAY_BANK_CODE || 'MB'

        return NextResponse.json({
            transaction,
            qr_code_url: qrCodeUrl,
            bank_info: {
                bank_name: BANK_NAMES[bankCode] || bankCode,
                account_no: process.env.SEPAY_ACCOUNT_NUMBER || '0123456789',
                account_name: process.env.SEPAY_ACCOUNT_NAME || 'KOREA LINK',
                amount: pkg.price_vnd,
                content: transactionCode
            }
        })
    } catch (error: any) {
        console.error('Error creating payment:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to create payment' },
            { status: 500 }
        )
    }
}
