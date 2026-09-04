'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle, CheckCircle2, Clock, RefreshCw, SearchX } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface SepayLog {
    id: string
    sepay_id: string | null
    gateway: string | null
    transaction_date: string | null
    account_number: string | null
    reference_number: string | null
    amount_in: number
    content: string
    transaction_code: string | null
    matched_transaction_id: string | null
    status: string
    message: string | null
    created_at: string
}

const FILTERS = [
    { value: 'all', label: 'Tat ca' },
    { value: 'completed', label: 'Da kich hoat' },
    { value: 'no_transaction_code', label: 'Thieu ma' },
    { value: 'transaction_not_found', label: 'Khong khop' },
    { value: 'amount_mismatch', label: 'Sai tien' },
    { value: 'error', label: 'Loi' }
]

function formatPrice(price: number) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(price)
}

function formatDate(dateString: string | null) {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleString('vi-VN')
}

function isManualReconciliation(log: Pick<SepayLog, 'status' | 'message'>) {
    return log.status === 'completed' && log.message?.startsWith('[MANUAL_RECONCILED]')
}

function getStatusBadge(log: Pick<SepayLog, 'status' | 'message'>) {
    if (isManualReconciliation(log)) {
        return <Badge className="bg-blue-600 gap-1"><CheckCircle2 className="w-3 h-3" />Đã đối soát thủ công</Badge>
    }
    const status = log.status
    switch (status) {
        case 'completed':
            return <Badge className="bg-emerald-500 gap-1"><CheckCircle className="w-3 h-3" />Da kich hoat</Badge>
        case 'no_transaction_code':
            return <Badge variant="destructive" className="gap-1"><SearchX className="w-3 h-3" />Thieu ma</Badge>
        case 'transaction_not_found':
            return <Badge variant="outline" className="gap-1"><SearchX className="w-3 h-3" />Khong khop</Badge>
        case 'amount_mismatch':
            return <Badge variant="destructive" className="gap-1"><AlertTriangle className="w-3 h-3" />Sai tien</Badge>
        case 'error':
            return <Badge variant="destructive" className="gap-1"><AlertTriangle className="w-3 h-3" />Loi</Badge>
        default:
            return <Badge variant="outline" className="gap-1"><Clock className="w-3 h-3" />{status}</Badge>
    }
}

export default function SepayLogsPage() {
    const [logs, setLogs] = useState<SepayLog[]>([])
    const [status, setStatus] = useState('all')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')
    const [reconcilingId, setReconcilingId] = useState<string | null>(null)

    const fetchLogs = useCallback(async (nextStatus = status) => {
        try {
            setLoading(true)
            setError('')
            setNotice('')
            const res = await fetch(`/api/admin/sepay-logs?status=${nextStatus}`)
            const data = await res.json().catch(() => null)

            if (!res.ok || !data?.success) {
                throw new Error(data?.error || 'Khong the tai log SePay')
            }

            setLogs(data.data || [])
            if (data.migrationRequired) {
                setNotice(data.message || 'Can chay migration tao bang sepay_webhook_logs.')
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Khong the tai log SePay')
        } finally {
            setLoading(false)
        }
    }, [status])

    useEffect(() => {
        fetchLogs(status)
    }, [fetchLogs, status])

    const reconcileLog = async (log: SepayLog) => {
        const confirmed = window.confirm(
            `Xác nhận giao dịch ${formatPrice(log.amount_in)} đã được kiểm tra và xử lý thủ công?\n\nThao tác này chỉ đóng cảnh báo, không kích hoạt gói hoặc cộng lượt lần nữa.`
        )
        if (!confirmed) return

        try {
            setReconcilingId(log.id)
            setError('')
            const response = await fetch('/api/admin/sepay-logs', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: log.id, note: 'Đã kiểm tra quyền lợi người dùng được kích hoạt trước đó' }),
            })
            const data = await response.json().catch(() => null)
            if (!response.ok || !data?.success) throw new Error(data?.error || 'Không thể cập nhật giao dịch')
            setNotice('Đã đóng cảnh báo đối soát. Hệ thống không cộng lượt hoặc kích hoạt gói thêm.')
            await fetchLogs(status)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Không thể đánh dấu đã đối soát')
        } finally {
            setReconcilingId(null)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Log SePay</h1>
                    <p className="text-muted-foreground">
                        Doi soat webhook ngan hang, giao dich thieu ma va ly do chua tu kich hoat.
                    </p>
                </div>
                <Button variant="outline" onClick={() => fetchLogs()} disabled={loading} className="gap-2">
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Tai lai
                </Button>
            </div>

            <div className="flex flex-wrap gap-2">
                {FILTERS.map((filter) => (
                    <Button
                        key={filter.value}
                        type="button"
                        variant={status === filter.value ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setStatus(filter.value)}
                    >
                        {filter.label}
                    </Button>
                ))}
            </div>

            {error && (
                <Card className="border-red-200 bg-red-50">
                    <CardContent className="py-4 text-sm font-medium text-red-700">{error}</CardContent>
                </Card>
            )}

            {notice && (
                <Card className="border-amber-200 bg-amber-50">
                    <CardContent className="py-4 text-sm font-medium text-amber-800">{notice}</CardContent>
                </Card>
            )}

            {loading ? (
                <div className="py-12 text-center text-muted-foreground">Dang tai...</div>
            ) : logs.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">Chua co log phu hop</CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {logs.map((log) => (
                        <Card key={log.id}>
                            <CardHeader className="pb-3">
                                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                                    <div>
                                        <CardTitle className="text-base flex flex-wrap items-center gap-2">
                                            {getStatusBadge(log)}
                                            <span>{formatPrice(log.amount_in)}</span>
                                        </CardTitle>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Nhan luc {formatDate(log.created_at)} · SePay ID {log.sepay_id || '-'}
                                        </p>
                                    </div>
                                    <div className="text-xs text-muted-foreground md:text-right">
                                        <p>Ma CK: <span className="font-semibold text-foreground">{log.transaction_code || '-'}</span></p>
                                        <p>Ma tham chieu: {log.reference_number || '-'}</p>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                <div>
                                    <p className="text-xs font-semibold uppercase text-muted-foreground">Noi dung ngan hang</p>
                                    <p className="break-words rounded-md bg-muted px-3 py-2">{log.content || '-'}</p>
                                </div>
                                <div className="grid gap-2 md:grid-cols-3 text-xs text-muted-foreground">
                                    <p>Tai khoan: <span className="text-foreground">{log.account_number || '-'}</span></p>
                                    <p>Gateway: <span className="text-foreground">{log.gateway || '-'}</span></p>
                                    <p>Thoi gian GD: <span className="text-foreground">{log.transaction_date || '-'}</span></p>
                                </div>
                                {log.message && (
                                    <p className="text-sm font-medium text-amber-700">{log.message}</p>
                                )}
                                {log.status !== 'completed' && log.amount_in > 0 ? (
                                    <div className="flex justify-end border-t pt-3">
                                        <Button
                                            type="button"
                                            size="sm"
                                            className="gap-2 bg-blue-600 hover:bg-blue-700"
                                            disabled={reconcilingId === log.id}
                                            onClick={() => reconcileLog(log)}
                                        >
                                            {reconcilingId === log.id ? <RefreshCw className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                                            Đánh dấu đã đối soát
                                        </Button>
                                    </div>
                                ) : null}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
