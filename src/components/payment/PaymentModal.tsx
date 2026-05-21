"use client"

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle2, Copy, QrCode } from 'lucide-react'
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

export function PaymentModal({ open, onClose, onSuccess }: PaymentModalProps) {
    const [packages, setPackages] = useState<PaymentPackage[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedPackage, setSelectedPackage] = useState<PaymentPackage | null>(null)
    const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null)
    const [bankInfo, setBankInfo] = useState<any>(null)
    const [transactionCode, setTransactionCode] = useState<string | null>(null)
    const [processingPayment, setProcessingPayment] = useState(false)

    useEffect(() => {
        if (open) {
            fetchPackages()
        }
    }, [open])

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
        setSelectedPackage(null)
        setQrCodeUrl(null)
        setBankInfo(null)
        setTransactionCode(null)
    }

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(price)
    }

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                    <div className="space-y-6">
                        <Card className="border-primary/20 bg-primary/5">
                            <CardHeader>
                                <CardTitle className="text-lg">Thông tin gói đã chọn</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Gói:</span>
                                    <span className="font-semibold">{selectedPackage.package_name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Số lượt:</span>
                                    <span className="font-semibold">{selectedPackage.credits} lượt</span>
                                </div>
                                <div className="flex justify-between text-lg">
                                    <span className="text-muted-foreground">Tổng tiền:</span>
                                    <span className="font-bold text-primary">
                                        {formatPrice(selectedPackage.price_vnd)}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="grid md:grid-cols-2 gap-6">
                            {/* QR Code */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <QrCode className="w-4 h-4" />
                                        Quét mã QR
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="flex justify-center">
                                    <Image
                                        src={qrCodeUrl}
                                        alt="QR Code"
                                        width={250}
                                        height={250}
                                        className="border rounded-lg"
                                    />
                                </CardContent>
                            </Card>

                            {/* Bank Info */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Thông tin chuyển khoản</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div>
                                        <p className="text-xs text-muted-foreground">Ngân hàng</p>
                                        <p className="font-semibold">{bankInfo?.bank_name}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Số tài khoản</p>
                                        <div className="flex items-center gap-2">
                                            <p className="font-semibold">{bankInfo?.account_no}</p>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0"
                                                onClick={() => copyToClipboard(bankInfo?.account_no)}
                                            >
                                                <Copy className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Chủ tài khoản</p>
                                        <p className="font-semibold">{bankInfo?.account_name}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Số tiền</p>
                                        <div className="flex items-center gap-2">
                                            <p className="font-semibold text-primary">
                                                {formatPrice(bankInfo?.amount)}
                                            </p>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0"
                                                onClick={() => copyToClipboard(bankInfo?.amount.toString())}
                                            >
                                                <Copy className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Nội dung chuyển khoản</p>
                                        <div className="flex items-center gap-2">
                                            <p className="font-semibold text-red-600">{transactionCode}</p>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0"
                                                onClick={() => copyToClipboard(transactionCode || '')}
                                            >
                                                <Copy className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <Card className="border-amber-500/50 bg-amber-50">
                            <CardContent className="pt-4">
                                <p className="text-sm text-amber-800">
                                    <strong>Lưu ý quan trọng:</strong>
                                </p>
                                <ul className="text-sm text-amber-700 mt-2 space-y-1 list-disc list-inside">
                                    <li>Vui lòng chuyển khoản <strong>ĐÚNG số tiền</strong> và <strong>ĐÚNG nội dung</strong></li>
                                    <li>Sau khi chuyển khoản, hệ thống sẽ tự động xác nhận trong vòng 5-10 phút</li>
                                    <li>Nếu quá 30 phút chưa được kích hoạt, vui lòng liên hệ admin</li>
                                </ul>
                            </CardContent>
                        </Card>

                        <div className="flex gap-3">
                            <Button variant="outline" onClick={handleBack} className="flex-1">
                                Chọn gói khác
                            </Button>
                            <Button onClick={onClose} className="flex-1">
                                Đã chuyển khoản
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
                                                    {processingPayment ? 'Đang xử lý...' : 'Chọn gói này'}
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
                                Mỗi tài khoản được tặng <strong>1 lượt miễn phí</strong> để làm đề thi mẫu.
                            </p>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
