'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { AlertTriangle, CheckCircle, XCircle, Clock, Loader2, User, Package, DollarSign } from 'lucide-react'
import { toast } from 'sonner'

interface Transaction {
    id: string
    transaction_code: string
    user_id: string
    package_id: string
    amount_vnd: number
    credits_purchased: number
    payment_status: 'pending' | 'completed' | 'failed'
    created_at: string
    verified_at?: string
    notes?: string
    product_type?: string | null
    duration_days_snapshot?: number | null
    activation_status?: string | null
    webhook_issue?: {
        id: string
        amount_in: number
        status: string
        message: string | null
        reference_number: string | null
        created_at: string
    } | null
    profiles: {
        id: string
        full_name: string
        email: string
    }
    payment_packages: {
        package_name: string
        credits: number
        price_vnd: number
    } | null
}

export default function AdminPaymentsPage() {
    const [activeTab, setActiveTab] = useState<'pending' | 'completed' | 'failed'>('pending')
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
    const [actionDialogOpen, setActionDialogOpen] = useState(false)
    const [actionType, setActionType] = useState<'approve' | 'reject'>('approve')
    const [notes, setNotes] = useState('')
    const [processing, setProcessing] = useState(false)
    const paidButNotActivatedCount = transactions.filter((transaction) => transaction.webhook_issue).length

    useEffect(() => {
        fetchTransactions(activeTab)
    }, [activeTab])

    const fetchTransactions = async (status: string) => {
        try {
            setLoading(true)
            const res = await fetch(`/api/admin/payments?status=${status}`)
            if (res.ok) {
                const data = await res.json()
                setTransactions(data)
            } else {
                toast.error('Không thể tải danh sách giao dịch')
            }
        } catch {
            toast.error('Lỗi kết nối')
        } finally {
            setLoading(false)
        }
    }

    const handleAction = async () => {
        if (!selectedTransaction) return

        setProcessing(true)
        try {
            const res = await fetch('/api/admin/payments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transaction_id: selectedTransaction.id,
                    action: actionType,
                    notes
                })
            })

            const data = await res.json()

            if (res.ok) {
                toast.success(data.message)
                setActionDialogOpen(false)
                setSelectedTransaction(null)
                setNotes('')
                await fetchTransactions(activeTab)
                window.dispatchEvent(new Event('admin-payment-attention-changed'))
            } else {
                toast.error(data.error || 'Có lỗi xảy ra')
            }
        } catch {
            toast.error('Lỗi xử lý giao dịch')
        } finally {
            setProcessing(false)
        }
    }

    const openActionDialog = (transaction: Transaction, action: 'approve' | 'reject') => {
        setSelectedTransaction(transaction)
        setActionType(action)
        setActionDialogOpen(true)
    }

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(price)
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('vi-VN')
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return <Badge variant="outline" className="gap-1"><Clock className="w-3 h-3" />Chờ duyệt</Badge>
            case 'completed':
                return <Badge className="bg-emerald-500 gap-1"><CheckCircle className="w-3 h-3" />Đã duyệt</Badge>
            case 'failed':
                return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" />Từ chối</Badge>
            default:
                return null
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Quản lý thanh toán</h1>
                <p className="text-muted-foreground">Đối soát giao dịch, xác định tài khoản và kích hoạt quyền đã mua.</p>
            </div>

            {activeTab === 'pending' && paidButNotActivatedCount > 0 ? (
                <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950" role="status">
                    <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" aria-hidden="true" />
                    <div>
                        <p className="font-semibold">
                            {paidButNotActivatedCount} giao dịch đã nhận tiền nhưng chưa kích hoạt
                        </p>
                        <p className="mt-0.5 text-sm text-amber-800">
                            Kiểm tra tài khoản và thông tin webhook bên dưới, sau đó chọn “Kích hoạt”.
                        </p>
                    </div>
                </div>
            ) : null}

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'pending' | 'completed' | 'failed')}>
                <TabsList>
                    <TabsTrigger value="pending" className="gap-2">
                        <Clock className="w-4 h-4" />
                        Chờ duyệt
                    </TabsTrigger>
                    <TabsTrigger value="completed" className="gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Đã duyệt
                    </TabsTrigger>
                    <TabsTrigger value="failed" className="gap-2">
                        <XCircle className="w-4 h-4" />
                        Từ chối
                    </TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="mt-6">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    ) : transactions.length === 0 ? (
                        <Card>
                            <CardContent className="py-12 text-center text-muted-foreground">
                                Không có giao dịch nào
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4">
                            {transactions.map((tx) => (
                                <Card key={tx.id} className={tx.webhook_issue ? 'border-amber-300 bg-amber-50/30' : undefined}>
                                    <CardHeader>
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                            <div className="space-y-1">
                                                <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
                                                    Mã GD: {tx.transaction_code}
                                                    {getStatusBadge(tx.payment_status)}
                                                    {tx.webhook_issue ? (
                                                        <Badge className="gap-1 border-amber-300 bg-amber-100 text-amber-900 hover:bg-amber-100">
                                                            <AlertTriangle className="size-3" aria-hidden="true" />
                                                            Đã nhận tiền · Chưa kích hoạt
                                                        </Badge>
                                                    ) : null}
                                                </CardTitle>
                                                <CardDescription>
                                                    {formatDate(tx.created_at)}
                                                </CardDescription>
                                            </div>
                                            {tx.payment_status === 'pending' && (
                                                <div className="flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="gap-2"
                                                        onClick={() => openActionDialog(tx, 'approve')}
                                                    >
                                                        <CheckCircle className="w-4 h-4" />
                                                        {tx.webhook_issue ? 'Kích hoạt' : 'Duyệt'}
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        className="gap-2"
                                                        onClick={() => openActionDialog(tx, 'reject')}
                                                    >
                                                        <XCircle className="w-4 h-4" />
                                                        Từ chối
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid md:grid-cols-3 gap-4">
                                            <div className="flex items-start gap-3">
                                                <User className="w-5 h-5 text-muted-foreground mt-0.5" />
                                                <div>
                                                    <p className="text-sm font-medium">{tx.profiles.full_name}</p>
                                                    <p className="text-xs text-muted-foreground">{tx.profiles.email}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-3">
                                                <Package className="w-5 h-5 text-muted-foreground mt-0.5" />
                                                <div>
                                                    <p className="text-sm font-medium">
                                                        {tx.product_type === 'interview_subscription'
                                                            ? 'Gói Phỏng vấn Vòng 2'
                                                            : tx.payment_packages?.package_name || 'Gói đã xóa'}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {tx.product_type === 'interview_subscription'
                                                            ? `${tx.duration_days_snapshot || 0} ngày sử dụng`
                                                            : `${tx.credits_purchased} lượt`}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-3">
                                                <DollarSign className="w-5 h-5 text-muted-foreground mt-0.5" />
                                                <div>
                                                    <p className="text-sm font-medium text-primary">{formatPrice(tx.amount_vnd)}</p>
                                                    <p className="text-xs text-muted-foreground">Số tiền</p>
                                                </div>
                                            </div>
                                        </div>
                                        {tx.webhook_issue ? (
                                            <div className="mt-4 rounded-lg border border-amber-200 bg-white p-3 text-sm">
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <p className="font-semibold text-amber-900">Đối soát webhook</p>
                                                    <span className="text-xs text-muted-foreground">
                                                        Nhận tiền {formatDate(tx.webhook_issue.created_at)}
                                                    </span>
                                                </div>
                                                <dl className="mt-2 grid gap-1 text-xs sm:grid-cols-2">
                                                    <div><dt className="inline text-muted-foreground">Số tiền nhận: </dt><dd className="inline font-semibold">{formatPrice(tx.webhook_issue.amount_in)}</dd></div>
                                                    <div><dt className="inline text-muted-foreground">Mã tham chiếu: </dt><dd className="inline font-medium">{tx.webhook_issue.reference_number || '-'}</dd></div>
                                                    <div className="sm:col-span-2"><dt className="inline text-muted-foreground">Nguyên nhân: </dt><dd className="inline font-medium text-amber-800">{tx.webhook_issue.message || tx.webhook_issue.status}</dd></div>
                                                </dl>
                                            </div>
                                        ) : null}
                                        {tx.notes && (
                                            <div className="mt-4 p-3 bg-muted rounded-md">
                                                <p className="text-sm text-muted-foreground">
                                                    <strong>Ghi chú:</strong> {tx.notes}
                                                </p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {actionType === 'approve' ? 'Duyệt giao dịch' : 'Từ chối giao dịch'}
                        </DialogTitle>
                        <DialogDescription>
                            {selectedTransaction && (
                                <>
                                    Mã GD: <strong>{selectedTransaction.transaction_code}</strong>
                                    <br />
                                    Người dùng: <strong>{selectedTransaction.profiles.full_name}</strong>
                                    <br />
                                    Quyền nhận: <strong>
                                        {selectedTransaction.product_type === 'interview_subscription'
                                            ? `${selectedTransaction.duration_days_snapshot || 0} ngày Phỏng vấn Vòng 2`
                                            : `${selectedTransaction.credits_purchased} lượt`}
                                    </strong>
                                    <br />
                                    Số tiền: <strong>{formatPrice(selectedTransaction.amount_vnd)}</strong>
                                </>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="notes">Ghi chú (tùy chọn)</Label>
                            <Textarea
                                id="notes"
                                placeholder="Nhập ghi chú về giao dịch này..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setActionDialogOpen(false)}
                            disabled={processing}
                        >
                            Hủy
                        </Button>
                        <Button
                            onClick={handleAction}
                            disabled={processing}
                            variant={actionType === 'approve' ? 'default' : 'destructive'}
                        >
                            {processing ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Đang xử lý...
                                </>
                            ) : (
                                <>
                                    {actionType === 'approve'
                                        ? selectedTransaction?.webhook_issue ? 'Xác nhận kích hoạt' : 'Xác nhận duyệt'
                                        : 'Xác nhận từ chối'}
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
