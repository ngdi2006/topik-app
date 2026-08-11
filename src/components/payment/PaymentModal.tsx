"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle2, Copy, AlertTriangle, TicketCheck, Mic2, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'
import { InterviewSubscriptionDialog } from '@/components/interview/InterviewSubscriptionDialog'

interface PaymentPackage {
    id: string
    package_name: string
    credits: number
    price_vnd: number
}

interface InterviewPlanSummary {
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
    const [interviewStartingPrice, setInterviewStartingPrice] = useState<number | null>(null)
    const [loading, setLoading] = useState(true)
    const [selectedPackage, setSelectedPackage] = useState<PaymentPackage | null>(null)
    const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null)
    const [bankInfo, setBankInfo] = useState<BankInfo | null>(null)
    const [transactionCode, setTransactionCode] = useState<string | null>(null)
    const [processingPayment, setProcessingPayment] = useState(false)
    const [paymentComplete, setPaymentComplete] = useState(false)
    const [interviewDialogOpen, setInterviewDialogOpen] = useState(false)
    const [epsPackagesOpen, setEpsPackagesOpen] = useState(false)
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
            const [examResponse, interviewResponse] = await Promise.all([
                fetch('/api/payment/packages'),
                fetch('/api/interview/plans', { cache: 'no-store' }),
            ])
            if (examResponse.ok) setPackages(await examResponse.json())
            if (interviewResponse.ok) {
                const payload = await interviewResponse.json() as { plans?: InterviewPlanSummary[] }
                const prices = (payload.plans || []).map((plan) => plan.price_vnd).filter((price) => price > 0)
                setInterviewStartingPrice(prices.length ? Math.min(...prices) : null)
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
                const data = await res.json().catch(() => null)
                alert(data?.error || 'Không thể tạo giao dịch. Vui lòng thử lại.')
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
        setEpsPackagesOpen(false)
        onClose()
    }

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(price)
    }

    return (
        <>
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className={`max-h-[92dvh] gap-3 overflow-y-auto rounded-3xl border border-border/50 bg-background/95 p-4 backdrop-blur-xl shadow-2xl transition-all duration-300 sm:p-6 ${!selectedPackage && !loading ? 'max-w-[calc(100vw-1.5rem)] sm:max-w-4xl' : 'max-w-md'}`}>
                {paymentComplete && (
                    <div className="absolute inset-0 bg-background/95 backdrop-blur-md z-50 flex flex-col items-center justify-center rounded-lg">
                        <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-4 animate-bounce" />
                        <h3 className="text-xl font-bold text-emerald-600 mb-2">Thanh toán thành công!</h3>
                        <p className="text-sm text-muted-foreground">Đang cập nhật số lượt...</p>
                    </div>
                )}
                <DialogHeader className="gap-1 text-left">
                    <DialogTitle className="text-xl font-black tracking-tight sm:text-2xl">
                        {selectedPackage ? 'Thanh toán' : 'Mua thêm'}
                    </DialogTitle>
                    <DialogDescription className="text-sm font-medium text-muted-foreground">
                        {selectedPackage
                            ? 'Quét mã QR hoặc chuyển khoản theo thông tin bên dưới'
                            : 'Chọn nội dung bạn muốn mua'}
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

                        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-900 flex items-start gap-2 shadow-sm">
                            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
                            <p className="font-semibold">
                                Bắt buộc giữ nguyên nội dung chuyển khoản. Hệ thống chỉ tự động kích hoạt khi giao dịch có đúng mã {transactionCode}.
                            </p>
                        </div>

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
                            <div className="flex items-start justify-between gap-3 px-4 py-3 hover:bg-muted/30 transition-colors bg-red-50/30">
                                <div>
                                    <span className="text-muted-foreground">Nội dung CK</span>
                                    <p className="text-[11px] font-medium text-red-600">Không sửa, không thêm bớt mã này.</p>
                                </div>
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className="font-bold text-red-600 text-xs break-all text-right">{transactionCode}</span>
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
                    <div className="space-y-3 pt-1 sm:space-y-5">
                        <div className="grid items-stretch gap-3 sm:grid-cols-2 sm:gap-4">
                        <div className="relative flex min-h-[172px] flex-col overflow-hidden rounded-2xl bg-gradient-to-br from-violet-700 via-indigo-600 to-blue-600 p-4 text-white shadow-lg shadow-violet-200/70 sm:p-5">
                            <div aria-hidden="true" className="absolute -right-8 -top-10 size-28 rounded-full border-[18px] border-white/10" />
                            <div className="relative flex flex-1 items-center gap-3">
                                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur-sm">
                                    <Mic2 className="size-5" />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <span className="inline-flex rounded-full bg-amber-300 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-amber-950">Đang ưu tiên</span>
                                    <h3 className="mt-1 text-lg font-black sm:text-xl">Phỏng vấn Vòng 2</h3>
                                    <p className="text-xs text-blue-100 sm:text-sm">Chọn gói học 10 ngày hoặc 30 ngày.</p>
                                </div>
                                <div className="shrink-0 text-right">
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-100">Từ</p>
                                    <p className="text-lg font-black text-white sm:text-xl">
                                        {interviewStartingPrice ? `${interviewStartingPrice / 1000}K` : '49K'}
                                    </p>
                                </div>
                            </div>
                            <Button
                                className="relative mt-4 h-10 w-full shrink-0 rounded-xl bg-white font-extrabold text-indigo-700 shadow-sm hover:bg-blue-50 hover:text-indigo-800"
                                onClick={() => {
                                    handleClose()
                                    setInterviewDialogOpen(true)
                                }}
                                type="button"
                            >
                                Mua gói
                                <ChevronRight className="size-4" />
                            </Button>
                        </div>

                        <div>
                            <div className="flex min-h-[172px] flex-col overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md sm:p-5">
                                <div className="flex flex-1 items-center gap-3">
                                    <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-200 ring-1 ring-blue-500/20">
                                        <TicketCheck className="size-5" />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="text-base font-extrabold text-slate-900 sm:text-lg">Thi thử EPS-TOPIK</h3>
                                        <p className="text-xs text-slate-500 sm:text-sm">Mua thêm lượt thi theo nhu cầu.</p>
                                    </div>
                                    <div className="shrink-0 text-right">
                                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Từ</p>
                                        <p className="text-lg font-black text-blue-600 sm:text-xl">
                                            {packages.length ? `${Math.min(...packages.map((pkg) => pkg.price_vnd)) / 1000}K` : '99K'}
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    className="mt-4 h-10 w-full shrink-0 rounded-xl bg-blue-600 font-extrabold text-white shadow-sm hover:bg-blue-700"
                                    onClick={() => setEpsPackagesOpen((value) => !value)}
                                >
                                    {epsPackagesOpen ? 'Thu gọn' : 'Mua gói'}
                                    <ChevronRight className={`size-4 transition-transform ${epsPackagesOpen ? 'rotate-90' : ''}`} />
                                </Button>
                            </div>
                        </div>
                        </div>
                        {epsPackagesOpen && (
                        <div className="mx-auto grid w-full max-w-4xl animate-in grid-cols-1 gap-2.5 fade-in slide-in-from-top-2 md:grid-cols-3 md:gap-4">
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
                                                ? 'p-3 sm:p-5 rounded-2xl border-2 border-primary/50 bg-blue-50/40 shadow-md shadow-primary/10 hover:border-primary scale-100 md:scale-[1.03] z-10'
                                                : isBest 
                                                    ? 'p-3 sm:p-5 rounded-2xl border border-emerald-200 bg-emerald-50/30 hover:border-teal-500/50 hover:shadow-lg'
                                                    : 'p-3 sm:p-5 rounded-2xl border border-slate-200 bg-white hover:border-blue-200 hover:shadow-lg'
                                            }
                                        `}
                                    >
                                        {isPopular && (
                                            <div className="absolute right-2 top-2 rounded-full bg-gradient-to-r from-primary to-blue-500 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-white shadow-sm whitespace-nowrap">
                                                ⭐ Phổ biến nhất
                                            </div>
                                        )}
                                        {isBest && (
                                            <div className="absolute right-2 top-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-white shadow-sm whitespace-nowrap">
                                                💎 Tiết kiệm nhất
                                            </div>
                                        )}

                                        <div className={`flex w-full flex-row items-center justify-between md:flex-col md:items-start ${isPopular || isBest ? 'mt-5 md:mt-4' : ''}`}>
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
                                                w-full rounded-xl h-8 sm:h-10 flex items-center justify-center font-bold text-[11px] sm:text-sm transition-all
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
                        )}

                        {epsPackagesOpen && <div className="flex items-center justify-center">
                            <p className="text-center text-xs font-medium text-muted-foreground sm:text-sm">
                                Mỗi tài khoản được tặng <span className="font-bold text-red-500">3 lượt miễn phí</span>.
                            </p>
                        </div>}
                    </div>
                )}
            </DialogContent>
        </Dialog>
        <InterviewSubscriptionDialog open={interviewDialogOpen} onOpenChange={setInterviewDialogOpen} />
        </>
    )
}
