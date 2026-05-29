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
            <DialogContent className={`max-h-[90vh] overflow-y-auto border border-border/50 bg-background/95 backdrop-blur-xl shadow-2xl transition-all duration-300 ${!selectedPackage && !loading ? 'max-w-[95vw] sm:max-w-4xl' : 'max-w-md'}`}>
                {paymentComplete && (
                    <div className="absolute inset-0 bg-background/95 backdrop-blur-md z-50 flex flex-col items-center justify-center rounded-lg">
                        <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-4 animate-bounce" />
                        <h3 className="text-xl font-bold text-emerald-600 mb-2">Thanh toán thành công!</h3>
                        <p className="text-sm text-muted-foreground">Đang cập nhật số lượt...</p>
                    </div>
                )}
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold tracking-tight">
                        {selectedPackage ? 'Thanh toán' : 'Mua lượt làm bài'}
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground font-medium">
                        {selectedPackage
                            ? 'Quét mã QR hoặc chuyển khoản theo thông tin bên dưới'
                            : 'Chọn gói phù hợp với nhu cầu luyện thi của bạn'}
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : selectedPackage && qrCodeUrl ? (
                    // Payment QR Screen
                    <div className="space-y-4">
                        <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                            <div className="text-sm font-medium">
                                <span className="text-foreground">{selectedPackage.package_name}</span>
                                <span className="mx-2 text-muted-foreground">·</span>
                                <span className="text-primary">{selectedPackage.credits} lượt</span>
                            </div>
                            <span className="text-lg font-extrabold text-primary">
                                {formatPrice(selectedPackage.price_vnd)}
                            </span>
                        </div>

                        <div className="flex flex-col items-center gap-4 rounded-xl border border-border/50 bg-card/50 p-6 shadow-sm">
                            <div className="p-2 bg-white rounded-xl shadow-sm">
                                <Image
                                    src={qrCodeUrl}
                                    alt="QR Code thanh toán"
                                    width={200}
                                    height={200}
                                    className="rounded-lg"
                                />
                            </div>
                            <p className="text-xs text-muted-foreground font-medium">Quét mã QR bằng app ngân hàng</p>
                        </div>

                        <p className="text-center text-xs text-muted-foreground">
                            Nếu không mở được app ngân hàng, hãy quét mã QR hoặc sao chép thông tin bên dưới.
                        </p>

                        <div className="rounded-xl border border-border/50 bg-card/30 divide-y divide-border/50 text-sm overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
                                <span className="text-muted-foreground">Ngân hàng</span>
                                <span className="font-semibold">{bankInfo?.bank_name}</span>
                            </div>
                            <div className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
                                <span className="text-muted-foreground">Số tài khoản</span>
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold">{bankInfo?.account_no}</span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 rounded-full bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary"
                                        onClick={() => copyToClipboard(bankInfo?.account_no || '')}
                                    >
                                        <Copy className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                            </div>
                            <div className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
                                <span className="text-muted-foreground">Chủ TK</span>
                                <span className="font-semibold">{bankInfo?.account_name}</span>
                            </div>
                            <div className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
                                <span className="text-muted-foreground">Số tiền</span>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-primary">{formatPrice(bankInfo?.amount || 0)}</span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 rounded-full bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary"
                                        onClick={() => copyToClipboard(String(bankInfo?.amount || ''))}
                                    >
                                        <Copy className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                            </div>
                            <div className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors bg-red-50/30">
                                <span className="text-muted-foreground">Nội dung CK</span>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-red-600 text-xs break-all">{transactionCode}</span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 rounded-full bg-red-100 text-red-600 hover:bg-red-200 hover:text-red-700 shrink-0"
                                        onClick={() => copyToClipboard(transactionCode || '')}
                                    >
                                        <Copy className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs text-emerald-800 flex items-center gap-2 shadow-sm">
                            <Loader2 className="w-4 h-4 animate-spin shrink-0 text-emerald-600" />
                            <p className="font-medium">Đang chờ xác nhận... Hệ thống sẽ tự động kích hoạt sau khi chuyển khoản.</p>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <Button variant="outline" onClick={handleBack} className="flex-1 rounded-xl h-11 font-semibold">
                                Chọn gói khác
                            </Button>
                            <Button
                                type="button"
                                onClick={() => window.open(qrCodeUrl, '_blank', 'noopener,noreferrer')}
                                className="flex-1 rounded-xl h-11 font-bold shadow-lg shadow-primary/20"
                            >
                                Mở app ngân hàng
                            </Button>
                        </div>
                    </div>
                ) : (
                    // Package Selection Screen
                    <div className="space-y-4 md:space-y-6 pt-2">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mt-2 w-full max-w-4xl mx-auto">
                            {packages.map((pkg) => {
                                const isPopular = pkg.credits === 20
                                const isBest = pkg.credits === 50

                                return (
                                    <button
                                        key={pkg.id}
                                        onClick={() => handleSelectPackage(pkg)}
                                        disabled={processingPayment}
                                        className={`
                                            group flex flex-col text-left transition-all duration-300 disabled:opacity-60 relative
                                            ${isPopular
                                                ? 'p-3 sm:p-6 rounded-2xl border-2 border-primary/50 bg-card/60 backdrop-blur-2xl shadow-xl shadow-primary/10 hover:border-primary scale-100 md:scale-105 z-10'
                                                : isBest 
                                                    ? 'p-3 sm:p-6 rounded-2xl border border-border/50 bg-card/30 backdrop-blur-xl hover:border-teal-500/50 hover:shadow-lg'
                                                    : 'p-3 sm:p-6 rounded-2xl border border-border/50 bg-card/30 backdrop-blur-xl hover:border-border hover:shadow-lg'
                                            }
                                        `}
                                    >
                                        {isPopular && (
                                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-primary to-blue-500 text-white text-[10px] font-bold rounded-full uppercase tracking-widest shadow-md whitespace-nowrap">
                                                ⭐ Phổ biến nhất
                                            </div>
                                        )}
                                        {isBest && (
                                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[10px] font-bold rounded-full uppercase tracking-widest shadow-md whitespace-nowrap">
                                                💎 Tiết kiệm nhất
                                            </div>
                                        )}

                                        <div className="flex flex-row md:flex-col items-center md:items-start justify-between w-full mt-1 md:mt-0">
                                            <div className="flex flex-col md:block text-left">
                                                <h3 className={`text-base sm:text-xl font-bold tracking-tight mb-0.5 md:mb-1 ${isPopular ? 'text-primary' : isBest ? 'bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 to-teal-500' : ''}`}>{pkg.package_name}</h3>
                                                <p className="text-muted-foreground mb-0 md:mb-3 text-[11px] sm:text-sm font-medium">{pkg.credits} lượt làm bài</p>
                                            </div>

                                            <div className="flex flex-col items-end md:items-start text-right md:text-left">
                                                <div className="mb-0.5 md:mb-1 md:mt-1 flex items-baseline gap-0.5 md:gap-1">
                                                    <span className={`text-xl sm:text-4xl font-extrabold ${isPopular ? 'text-primary' : isBest ? 'text-teal-600' : ''}`}>
                                                        {(pkg.price_vnd / 1000).toFixed(0)}K
                                                    </span>
                                                    <span className="text-muted-foreground font-semibold text-[10px] sm:text-sm">VNĐ</span>
                                                </div>

                                                <p className={`text-[10px] sm:text-sm font-semibold h-auto md:h-4 mb-0 md:mb-6 ${isPopular ? 'text-primary' : isBest ? 'text-teal-600' : 'text-primary'}`}>
                                                    ≈ {Math.round(pkg.price_vnd / pkg.credits / 1000)}k / lượt
                                                </p>
                                            </div>
                                        </div>

                                        <div className="mt-2 md:mt-auto w-full">
                                            <div className={`
                                                w-full rounded-lg sm:rounded-xl h-8 sm:h-11 flex items-center justify-center font-bold text-[11px] sm:text-sm transition-all
                                                ${isPopular
                                                    ? 'bg-primary hover:bg-primary/90 text-white shadow-md sm:shadow-lg shadow-primary/25'
                                                    : isBest
                                                        ? 'border border-border/80 hover:bg-teal-600 hover:text-white hover:border-teal-600'
                                                        : 'border border-border/80 hover:bg-accent hover:text-accent-foreground'
                                                }
                                            `}>
                                                {processingPayment ? (
                                                    <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                                                ) : 'Mua gói này'}
                                            </div>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>

                        <div className="mt-4 flex items-center justify-center">
                            <p className="text-sm text-muted-foreground font-medium text-center">
                                Mỗi tài khoản được tặng <span className="font-bold text-red-500">3 lượt miễn phí</span>.
                            </p>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
