"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle2, Copy } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'

interface PaymentPackage {
    id: string
    package_name: string
    credits: number
    price_vnd: number
}

interface PaymentModalProps {
    open: boolean
    onClose: () => void
    onSuccess?: () => void
}

interface BankInfo {
    bank_name: string
    account_no: string
    account_name: string
    amount: number
    content: string
}

export function PaymentModal({ open, onClose, onSuccess }: PaymentModalProps) {
    const [packages, setPackages] = useState<PaymentPackage[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedPackage, setSelectedPackage] = useState<PaymentPackage | null>(null)
    const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null)
    const [bankInfo, setBankInfo] = useState<BankInfo | null>(null)
    const [transactionCode, setTransactionCode] = useState<string | null>(null)
    const [processingPayment, setProcessingPayment] = useState(false)
    const [paymentComplete, setPaymentComplete] = useState(false)
    const pollingRef = useRef<NodeJS.Timeout | null>(null)

    const stopPolling = useCallback(() => {
        if (pollingRef.current) {
            clearInterval(pollingRef.current)
            pollingRef.current = null
        }
    }, [])

    const startPolling = useCallback((code: string) => {
        stopPolling()
        pollingRef.current = setInterval(async () => {
            try {
                const res = await fetch('/api/payment/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ transaction_code: code })
                })
                if (!res.ok) return
                const data = await res.json()
                if (data.status === 'completed') {
                    stopPolling()
                    setPaymentComplete(true)
                    toast.success('Thanh toán thành công!')
                    setTimeout(() => {
                        onSuccess?.()
                        stopPolling()
                        setSelectedPackage(null)
                        setQrCodeUrl(null)
                        setBankInfo(null)
                        setTransactionCode(null)
                        setPaymentComplete(false)
                        onClose()
                    }, 2500)
                }
            } catch { }
        }, 5000)
    }, [stopPolling, onSuccess, onClose])

    useEffect(() => {
        return () => stopPolling()
    }, [stopPolling])

    useEffect(() => {
        if (open) {
            fetchPackages()
            setPaymentComplete(false)
        } else {
            stopPolling()
        }
    }, [open, stopPolling])

    const fetchPackages = async () => {
        try {
            setLoading(true)
            const res = await fetch('/api/payment/packages')
            if (res.ok) {
                const data = await res.json()
                setPackages(data)
            }
        } catch (error) {
            console.error('Error fetching packages:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSelectPackage = async (pkg: PaymentPackage) => {
        try {
            setProcessingPayment(true)
            setSelectedPackage(pkg)

            const res = await fetch('/api/payment/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ package_id: pkg.id })
            })

            if (res.ok) {
                const data = await res.json()
                setQrCodeUrl(data.qr_code_url)
                setBankInfo(data.bank_info)
                setTransactionCode(data.transaction.transaction_code)
                startPolling(data.transaction.transaction_code)
            } else {
                alert('Không thể tạo giao dịch. Vui lòng thử lại.')
                setSelectedPackage(null)
            }
        } catch (error) {
            console.error('Error creating payment:', error)
            alert('Có lỗi xảy ra. Vui lòng thử lại.')
            setSelectedPackage(null)
        } finally {
            setProcessingPayment(false)
        }
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
        alert('Đã sao chép!')
    }

    const handleBack = () => {
        stopPolling()
        setSelectedPackage(null)
        setQrCodeUrl(null)
        setBankInfo(null)
        setTransactionCode(null)
        setPaymentComplete(false)
    }

    const handleClose = () => {
        stopPolling()
        setSelectedPackage(null)
        setQrCodeUrl(null)
        setBankInfo(null)
        setTransactionCode(null)
        setPaymentComplete(false)
        onClose()
    }

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(price)
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                {paymentComplete && (
                    <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center rounded-lg">
                        <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-4" />
                        <h3 className="text-xl font-bold text-emerald-600 mb-2">Thanh toán thành công!</h3>
                        <p className="text-sm text-muted-foreground">Đang cập nhật số lượt...</p>
                    </div>
                )}
                <DialogHeader>
                    <DialogTitle className="text-2xl">
                        {selectedPackage ? 'Thanh toán' : 'Mua lượt làm bài'}
                    </DialogTitle>
                    <DialogDescription>
                        {selectedPackage
                            ? 'Quét mã QR hoặc chuyển khoản theo thông tin bên dưới'
                            : 'Chọn gói phù hợp với nhu cầu của bạn'}
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : selectedPackage && qrCodeUrl ? (
                    // Payment QR Screen
                    <div className="space-y-4">
                        <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-4 py-3">
                            <div className="text-sm">
                                <span className="text-muted-foreground">{selectedPackage.package_name}</span>
                                <span className="mx-2 text-muted-foreground">·</span>
                                <span className="text-muted-foreground">{selectedPackage.credits} lượt</span>
                            </div>
                            <span className="text-lg font-bold text-primary">
                                {formatPrice(selectedPackage.price_vnd)}
                            </span>
                        </div>

                        <div className="flex flex-col items-center gap-4 rounded-lg border p-4">
                            <Image
                                src={qrCodeUrl}
                                alt="QR Code thanh toán"
                                width={200}
                                height={200}
                                className="rounded-lg"
                            />
                            <p className="text-xs text-muted-foreground">Quét mã QR bằng app ngân hàng</p>
                        </div>

                        <p className="text-center text-xs text-muted-foreground">
                            Nếu không mở được app ngân hàng, hãy quét mã QR hoặc sao chép thông tin bên dưới.
                        </p>

                        <div className="rounded-lg border divide-y text-sm">
                            <div className="flex items-center justify-between px-4 py-2.5">
                                <span className="text-muted-foreground">Ngân hàng</span>
                                <span className="font-medium">{bankInfo?.bank_name}</span>
                            </div>
                            <div className="flex items-center justify-between px-4 py-2.5">
                                <span className="text-muted-foreground">Số tài khoản</span>
                                <div className="flex items-center gap-1.5">
                                    <span className="font-medium">{bankInfo?.account_no}</span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0"
                                        onClick={() => copyToClipboard(bankInfo?.account_no || '')}
                                    >
                                        <Copy className="w-3 h-3" />
                                    </Button>
                                </div>
                            </div>
                            <div className="flex items-center justify-between px-4 py-2.5">
                                <span className="text-muted-foreground">Chủ TK</span>
                                <span className="font-medium">{bankInfo?.account_name}</span>
                            </div>
                            <div className="flex items-center justify-between px-4 py-2.5">
                                <span className="text-muted-foreground">Số tiền</span>
                                <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-primary">{formatPrice(bankInfo?.amount || 0)}</span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0"
                                        onClick={() => copyToClipboard(String(bankInfo?.amount || ''))}
                                    >
                                        <Copy className="w-3 h-3" />
                                    </Button>
                                </div>
                            </div>
                            <div className="flex items-center justify-between px-4 py-2.5">
                                <span className="text-muted-foreground">Nội dung CK</span>
                                <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-red-600 text-xs break-all">{transactionCode}</span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0 shrink-0"
                                        onClick={() => copyToClipboard(transactionCode || '')}
                                    >
                                        <Copy className="w-3 h-3" />
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs text-emerald-800 flex items-center gap-2">
                            <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                            <p>Đang chờ xác nhận... Hệ thống sẽ tự động kích hoạt sau khi chuyển khoản.</p>
                        </div>

                        <div className="flex gap-3">
                            <Button variant="outline" onClick={handleBack} className="flex-1">
                                Chọn gói khác
                            </Button>
                            <Button
                                type="button"
                                onClick={() => window.open(qrCodeUrl, '_blank', 'noopener,noreferrer')}
                                className="flex-1"
                            >
                                Mở app ngân hàng
                            </Button>
                        </div>
                    </div>
                ) : (
                    // Package Selection Screen
                    <div className="space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {packages.map((pkg) => {
                                const isPopular = pkg.credits === 20
                                const isBest = pkg.credits === 50
                                const hasTag = isPopular || isBest
                                return (
                                    <button
                                        key={pkg.id}
                                        onClick={() => handleSelectPackage(pkg)}
                                        disabled={processingPayment}
                                        className={`
                                            flex flex-col rounded-xl text-left transition-all duration-200
                                            border-2 hover:shadow-lg disabled:opacity-60 overflow-hidden
                                            ${isPopular
                                                ? 'border-blue-500 bg-blue-50/50 hover:bg-blue-50 shadow-md'
                                                : isBest
                                                    ? 'border-emerald-500 bg-emerald-50/50 hover:bg-emerald-50 shadow-md'
                                                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                                            }
                                        `}
                                    >
                                        {hasTag && (
                                            <div className={`
                                                w-full text-center text-xs font-bold py-1.5 text-white
                                                ${isPopular
                                                    ? 'bg-linear-to-r from-blue-600 to-blue-500'
                                                    : 'bg-linear-to-r from-emerald-600 to-emerald-500'
                                                }
                                            `}>
                                                {isPopular ? '⭐ Phổ biến nhất' : '💎 Tiết kiệm nhất'}
                                            </div>
                                        )}

                                        <div className="flex flex-col flex-1 p-4">
                                            <h3 className="font-bold text-base text-gray-900">{pkg.package_name}</h3>
                                            <p className="text-sm text-gray-500 mt-0.5">{pkg.credits} lượt làm bài</p>

                                            <div className="mt-3">
                                                <span className={`text-2xl font-extrabold ${isPopular ? 'text-blue-600' : isBest ? 'text-emerald-600' : 'text-gray-900'}`}>
                                                    {(pkg.price_vnd / 1000).toFixed(0)}K
                                                </span>
                                                <span className="text-sm text-gray-400 ml-1">VNĐ</span>
                                            </div>

                                            <p className="text-xs text-gray-400 mt-1">
                                                ≈ {Math.round(pkg.price_vnd / pkg.credits / 1000)}k / lượt
                                            </p>

                                            <div className={`
                                                mt-auto pt-3 w-full
                                            `}>
                                                <div className={`
                                                    w-full py-2 rounded-lg text-sm font-semibold text-center transition-colors
                                                    ${isPopular
                                                        ? 'bg-blue-600 text-white'
                                                        : isBest
                                                            ? 'bg-emerald-600 text-white'
                                                            : 'bg-gray-900 text-white'
                                                    }
                                                `}>
                                                    {processingPayment ? 'Đang xử lý...' : 'Mua gói'}
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>

                        <div className="flex items-start gap-3 rounded-lg bg-emerald-50 border border-emerald-200 p-3">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                            <p className="text-sm text-emerald-800">
                                Mỗi tài khoản được tặng <strong className="font-bold text-red-600">3 lượt miễn phí</strong>.
                            </p>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
