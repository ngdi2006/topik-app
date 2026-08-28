'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
    AlertTriangle,
    BrainCircuit,
    CheckCircle2,
    Database,
    Loader2,
    Play,
    RefreshCw,
    Square,
} from 'lucide-react'
import { toast } from 'sonner'

type Warehouse = {
    id: string
    name: string
    description: string | null
    icon: string | null
    color: string | null
    total: number
    pending: number
    analyzed: number
}

type SyncOverview = {
    schemaReady: boolean
    analysisVersion: number
    totals: { total: number; pending: number; analyzed: number }
    warehouses: Warehouse[]
}

type SyncLog = { id: string; status: 'success' | 'error'; error?: string }
type SyncScope = 'missing' | 'all'
type BatchResponse = {
    error?: string
    processed: number
    finished: boolean
    nextCursor?: string | null
    results?: SyncLog[]
}

const numberFormatter = new Intl.NumberFormat('vi-VN')

function readableError(value: unknown, fallback: string) {
    if (typeof value === 'string' && value) return value
    if (value && typeof value === 'object') {
        const error = value as Record<string, unknown>
        if (typeof error.message === 'string') return error.message
        if (typeof error.details === 'string') return error.details
    }
    return fallback
}

export default function AISyncPage() {
    const [overview, setOverview] = useState<SyncOverview | null>(null)
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(null)
    const [scope, setScope] = useState<SyncScope>('missing')
    const [isLoading, setIsLoading] = useState(true)
    const [isRunning, setIsRunning] = useState(false)
    const [processed, setProcessed] = useState(0)
    const [logs, setLogs] = useState<SyncLog[]>([])
    const [runError, setRunError] = useState<string | null>(null)
    const stopRequestedRef = useRef(false)

    const loadOverview = useCallback(async () => {
        try {
            const response = await fetch('/api/admin/ai-sync', { cache: 'no-store' })
            const data = await response.json()
            if (!response.ok) throw new Error(readableError(data.error, 'Không thể tải trạng thái các kho'))
            setOverview(data)
            setSelectedWarehouseId((current) => current || data.warehouses.find((item: Warehouse) => item.total > 0)?.id || null)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Không thể tải trạng thái các kho')
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        loadOverview()
    }, [loadOverview])

    const selectedWarehouse = overview?.warehouses.find((item) => item.id === selectedWarehouseId) || null
    const targetCount = selectedWarehouse ? (scope === 'missing' ? selectedWarehouse.pending : selectedWarehouse.total) : 0
    const progress = targetCount > 0 ? Math.min(100, Math.round((processed / targetCount) * 100)) : 0

    const startSync = async () => {
        if (!selectedWarehouse || targetCount === 0 || isRunning) return
        if (!overview?.schemaReady) {
            toast.error('Cần chạy migration AI analysis trước khi bắt đầu')
            return
        }

        stopRequestedRef.current = false
        setIsRunning(true)
        setProcessed(0)
        setLogs([])
        setRunError(null)
        let cursor: string | null = null
        let totalProcessed = 0

        toast.info(`Bắt đầu phân tích kho “${selectedWarehouse.name}”`)

        try {
            while (!stopRequestedRef.current) {
                const response: Response = await fetch('/api/admin/ai-sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        categoryId: selectedWarehouse.id,
                        scope,
                        cursor,
                        batchSize: 2,
                    }),
                })
                const data = await response.json() as BatchResponse
                if (!response.ok) throw new Error(readableError(data.error, 'Lô phân tích AI thất bại'))

                const newLogs = Array.isArray(data.results) ? data.results as SyncLog[] : []
                totalProcessed += Number(data.processed) || 0
                setProcessed(totalProcessed)
                setLogs((current) => [...current, ...newLogs])
                cursor = data.nextCursor || null

                if (data.finished || data.processed === 0) break
                await new Promise((resolve) => window.setTimeout(resolve, 1_500))
            }

            if (stopRequestedRef.current) toast.info('Đã dừng sau khi hoàn tất lô hiện tại')
            else toast.success(`Đã phân tích ${numberFormatter.format(totalProcessed)} câu trong kho “${selectedWarehouse.name}”`)
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Tiến trình đồng bộ bị dừng'
            setRunError(message)
            toast.error(message)
        } finally {
            setIsRunning(false)
            await loadOverview()
        }
    }

    return (
        <div className="mx-auto max-w-6xl space-y-5">
            <header>
                <div className="flex items-center gap-3">
                    <span className="grid size-11 place-items-center rounded-xl bg-blue-100 text-blue-700">
                        <BrainCircuit className="size-6" aria-hidden="true" />
                    </span>
                    <div>
                        <h1 className="text-pretty text-2xl font-bold text-slate-950">Dịch & phân tích kho câu hỏi</h1>
                        <p className="mt-1 text-sm text-slate-500">Admin chủ động chọn kho; hệ thống không tự gọi AI khi chưa có lệnh.</p>
                    </div>
                </div>
            </header>

            {!overview?.schemaReady && !isLoading ? (
                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" role="alert">
                    <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                    <div>
                        <p className="font-bold">Chưa bật cấu trúc phân tích chi tiết</p>
                        <p className="mt-1">Chạy migration <code>202608270001_add_question_ai_analysis.sql</code> trước khi ra lệnh phân tích.</p>
                    </div>
                </div>
            ) : null}

            <section className="grid grid-cols-3 gap-3" aria-label="Tổng quan dữ liệu AI">
                {[
                    ['Tổng câu hỏi', overview?.totals.total || 0, 'text-slate-900'],
                    ['Đã phân tích', overview?.totals.analyzed || 0, 'text-emerald-700'],
                    ['Chờ phân tích', overview?.totals.pending || 0, 'text-amber-700'],
                ].map(([label, value, tone]) => (
                    <div key={String(label)} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <p className="text-xs font-semibold text-slate-500">{label}</p>
                        <p className={`mt-1 text-2xl font-black tabular-nums ${tone}`}>{numberFormatter.format(Number(value))}</p>
                    </div>
                ))}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-labelledby="warehouse-heading">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h2 id="warehouse-heading" className="font-bold text-slate-950">1. Chọn kho cần xử lý</h2>
                        <p className="mt-1 text-xs text-slate-500">Mỗi lệnh chỉ tác động đến kho được chọn.</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => { setIsLoading(true); loadOverview() }}
                        disabled={isLoading || isRunning}
                        className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50"
                    >
                        <RefreshCw className={`size-3.5 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
                        Làm mới
                    </button>
                </div>

                {isLoading ? (
                    <div className="grid min-h-40 place-items-center" aria-live="polite">
                        <Loader2 className="size-7 animate-spin text-blue-600" aria-hidden="true" />
                    </div>
                ) : overview?.warehouses.length ? (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {overview.warehouses.map((warehouse) => {
                            const selected = warehouse.id === selectedWarehouseId
                            const percent = warehouse.total ? Math.round((warehouse.analyzed / warehouse.total) * 100) : 0
                            return (
                                <button
                                    key={warehouse.id}
                                    type="button"
                                    onClick={() => setSelectedWarehouseId(warehouse.id)}
                                    disabled={isRunning}
                                    aria-pressed={selected}
                                    className={`min-w-0 rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${selected ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-slate-200 hover:border-blue-200 hover:bg-slate-50'} disabled:cursor-not-allowed disabled:opacity-60`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="truncate font-bold text-slate-900"><span aria-hidden="true">{warehouse.icon || '📚'}</span> {warehouse.name}</p>
                                            <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{warehouse.description || 'Kho câu hỏi TOPIK'}</p>
                                        </div>
                                        {selected ? <CheckCircle2 className="size-5 shrink-0 text-blue-600" aria-hidden="true" /> : null}
                                    </div>
                                    <div className="mt-4 flex items-center justify-between text-xs">
                                        <span className="font-medium text-slate-600">{numberFormatter.format(warehouse.total)} câu</span>
                                        <span className={warehouse.pending ? 'font-bold text-amber-700' : 'font-bold text-emerald-700'}>{warehouse.pending} chờ</span>
                                    </div>
                                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                                        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${percent}%` }} />
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                ) : (
                    <div className="mt-4 rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-500">Chưa có kho câu hỏi.</div>
                )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-labelledby="command-heading">
                <h2 id="command-heading" className="font-bold text-slate-950">2. Ra lệnh dịch & phân tích</h2>
                <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
                    <fieldset disabled={isRunning}>
                        <legend className="text-xs font-bold uppercase tracking-wide text-slate-500">Phạm vi xử lý</legend>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                            <label className={`flex cursor-pointer gap-3 rounded-xl border p-3 ${scope === 'missing' ? 'border-blue-400 bg-blue-50' : 'border-slate-200'}`}>
                                <input type="radio" name="sync-scope" value="missing" checked={scope === 'missing'} onChange={() => setScope('missing')} />
                                <span><span className="block text-sm font-bold text-slate-900">Chỉ câu còn thiếu</span><span className="mt-0.5 block text-xs text-slate-500">Tiết kiệm chi phí, không ghi đè dữ liệu đủ.</span></span>
                            </label>
                            <label className={`flex cursor-pointer gap-3 rounded-xl border p-3 ${scope === 'all' ? 'border-violet-400 bg-violet-50' : 'border-slate-200'}`}>
                                <input type="radio" name="sync-scope" value="all" checked={scope === 'all'} onChange={() => setScope('all')} />
                                <span><span className="block text-sm font-bold text-slate-900">Phân tích lại toàn kho</span><span className="mt-0.5 block text-xs text-slate-500">Ghi đè bằng cấu trúc phân tích mới nhất.</span></span>
                            </label>
                        </div>
                    </fieldset>

                    {isRunning ? (
                        <button type="button" onClick={() => { stopRequestedRef.current = true }} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 font-bold text-red-700 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500">
                            <Square className="size-4 fill-current" aria-hidden="true" /> Dừng sau lô này
                        </button>
                    ) : (
                        <button type="button" onClick={startSync} disabled={!selectedWarehouse || targetCount === 0 || !overview?.schemaReady} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 font-bold text-white shadow-sm hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300">
                            <Play className="size-4 fill-current" aria-hidden="true" /> Phân tích {numberFormatter.format(targetCount)} câu
                        </button>
                    )}
                </div>

                <div className="mt-5 rounded-xl bg-slate-50 p-4" aria-live="polite">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                        <span className="font-semibold text-slate-700">{isRunning ? `Đang xử lý kho “${selectedWarehouse?.name}”…` : selectedWarehouse ? `Đã chọn: ${selectedWarehouse.name}` : 'Chưa chọn kho'}</span>
                        <span className="font-bold tabular-nums text-blue-700">{processed}/{targetCount} câu</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuemin={0} aria-valuemax={targetCount} aria-valuenow={processed}>
                        <div className="h-full rounded-full bg-blue-600 transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${progress}%` }} />
                    </div>
                    {runError ? <p className="mt-3 text-sm font-medium text-red-700">{runError}</p> : null}
                </div>
            </section>

            {logs.length > 0 ? (
                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" aria-labelledby="sync-log-heading">
                    <h2 id="sync-log-heading" className="text-sm font-bold text-slate-900">Nhật ký lệnh hiện tại</h2>
                    <div className="mt-3 max-h-64 space-y-2 overflow-y-auto overscroll-contain pr-1">
                        {logs.map((log, index) => (
                            <div key={`${log.id}-${index}`} className="flex items-start gap-2 rounded-lg bg-slate-50 p-2.5 text-xs">
                                {log.status === 'success' ? <CheckCircle2 className="size-4 shrink-0 text-emerald-600" aria-hidden="true" /> : <AlertTriangle className="size-4 shrink-0 text-red-600" aria-hidden="true" />}
                                <div className="min-w-0"><p className="break-all font-semibold text-slate-700">Câu {log.id}</p>{log.error ? <p className="mt-1 text-red-700">{log.error}</p> : null}</div>
                            </div>
                        ))}
                    </div>
                </section>
            ) : null}

            <aside className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
                <Database className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                <p><strong>Dữ liệu được lưu:</strong> bản dịch, từ vựng, ngữ pháp, dạng câu, manh mối, giải thích từng đáp án, chiến lược giải và lỗi thường gặp. Màn hình luyện lại sẽ đọc dữ liệu đã lưu, không gọi Gemini trực tiếp.</p>
            </aside>
        </div>
    )
}
