import type { LucideIcon } from "lucide-react"
import Link from "next/link"
import { Activity, AlertTriangle, Award, Banknote, BrainCircuit, CheckCircle2, FileText, Gauge, GraduationCap, Lightbulb, ShieldCheck, TrendingUp, UserCheck, Users } from "lucide-react"
import { createAdminClient } from "@/lib/supabase/admin"
import { OnlineUsersCounter } from "@/components/admin/OnlineUsersCounter"

export const dynamic = 'force-dynamic'

type AttemptRow = { user_id: string; status: string | null; score: number | null; total_points: number | null; started_at: string | null; completed_at: string | null; created_at: string | null }
type PaymentRow = { user_id: string; amount_vnd: number | null; payment_status: string | null; created_at: string | null; verified_at: string | null }
type SepayWebhookRow = { id: string; sepay_id: string | null; amount_in: number | null; status: string; transaction_date: string | null; created_at: string; matched_transaction_id: string | null }
type EntitlementRow = { user_id: string; status: string; expires_at: string }
type UsageRow = { feature: string; status: string; latency_ms: number | null; estimated_cost_usd: number | null; created_at: string }
type ProgressRow = { user_id: string; progress_percent: number | null; is_completed: boolean | null; last_accessed_at: string | null; created_at: string | null }
type LearningEventRow = { event_name: string; content_id: string | null; is_correct: boolean | null; metadata: Record<string, unknown> | null; occurred_at: string }

const DAY = 86_400_000
const formatNumber = new Intl.NumberFormat('vi-VN')
const formatMoney = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value)

function MetricCard({ label, value, hint, icon: Icon, tone = 'blue' }: { label: string; value: string | number; hint: string; icon: LucideIcon; tone?: 'blue' | 'green' | 'violet' | 'amber' }) {
    const tones = {
        blue: 'bg-blue-50 text-blue-700', green: 'bg-emerald-50 text-emerald-700',
        violet: 'bg-violet-50 text-violet-700', amber: 'bg-amber-50 text-amber-700',
    }
    return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium text-slate-600">{label}</p><p className="mt-2 text-2xl font-black tracking-tight text-slate-950">{value}</p></div><span className={`grid size-10 place-items-center rounded-xl ${tones[tone]}`}><Icon className="size-5" /></span></div>
        <p className="mt-2 text-xs leading-5 text-slate-500">{hint}</p>
    </div>
}

function TrendChart({ rows }: { rows: Array<{ label: string; registrations: number; completions: number }> }) {
    const max = Math.max(1, ...rows.flatMap((row) => [row.registrations, row.completions]))
    return <div>
        <div className="mb-5 flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600"><span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-full bg-blue-600" />Đăng ký mới</span><span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-full bg-emerald-500" />Hoàn thành bài thi</span></div>
        <div className="grid h-56 grid-cols-[repeat(14,minmax(0,1fr))] items-end gap-1.5 border-b border-slate-200 sm:gap-2">
            {rows.map((row, index) => <div className="relative flex h-full items-end justify-center gap-0.5" key={row.label} title={`${row.label}: ${row.registrations} đăng ký, ${row.completions} hoàn thành`}>
                <div className="w-2 rounded-t bg-blue-600/90 transition hover:bg-blue-700 sm:w-3" style={{ height: `${Math.max(row.registrations ? 5 : 1, row.registrations / max * 100)}%` }} />
                <div className="w-2 rounded-t bg-emerald-500/90 transition hover:bg-emerald-600 sm:w-3" style={{ height: `${Math.max(row.completions ? 5 : 1, row.completions / max * 100)}%` }} />
                {(index % 3 === 0 || index === rows.length - 1) && <span className="absolute -bottom-6 whitespace-nowrap text-[10px] text-slate-400">{row.label}</span>}
            </div>)}
        </div>
        <div className="h-6" />
    </div>
}

function FunnelStep({ label, value, total, detail }: { label: string; value: number; total: number; detail: string }) {
    const rate = total ? Math.min(100, Math.round(value / total * 100)) : 0
    return <div className="grid gap-2 sm:grid-cols-[160px_1fr_92px] sm:items-center">
        <div><p className="text-sm font-semibold text-slate-800">{label}</p><p className="text-xs text-slate-400">{detail}</p></div>
        <div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-400" style={{ width: `${rate}%` }} /></div>
        <div className="text-left sm:text-right"><strong className="text-sm text-slate-900">{formatNumber.format(value)}</strong><span className="ml-2 text-xs text-slate-400">{rate}%</span></div>
    </div>
}

function RetentionCard({ label, value, eligible, description }: { label: string; value: number; eligible: number; description: string }) {
    return <div className="rounded-xl bg-slate-50 p-4">
        <div className="flex items-baseline justify-between gap-2"><strong className="text-xl text-slate-950">{value}%</strong><span className="text-xs font-bold text-blue-600">{label}</span></div>
        <p className="mt-2 text-xs leading-5 text-slate-500">{description}</p>
        <p className="mt-2 text-[11px] text-slate-400">Mẫu đo: {formatNumber.format(eligible)} người</p>
    </div>
}

export default async function AdminDashboardPage() {
    const admin = createAdminClient()
    // Server dashboard is intentionally evaluated against the request time.
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now()
    const since7 = new Date(now - 7 * DAY).toISOString()
    const since30 = new Date(now - 30 * DAY).toISOString()
    const since14 = new Date(now - 13 * DAY)
    since14.setHours(0, 0, 0, 0)

    const [studentResult, examResult, attemptResult, paymentResult, sepayResult, entitlementResult, usageResult, progressResult, learningEventResult, authResult] = await Promise.all([
        admin.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'learner'),
        admin.from('exams').select('*', { count: 'exact', head: true }),
        admin.from('exam_attempts').select('user_id, status, score, total_points, started_at, completed_at, created_at').gte('created_at', since30),
        admin.from('payment_transactions').select('user_id, amount_vnd, payment_status, created_at, verified_at').eq('payment_status', 'completed').order('verified_at', { ascending: false, nullsFirst: false }).limit(5000),
        admin.from('sepay_webhook_logs').select('id, sepay_id, amount_in, status, transaction_date, created_at, matched_transaction_id').gt('amount_in', 0).gte('created_at', since30),
        admin.from('user_interview_entitlements').select('user_id, status, expires_at'),
        admin.from('interview_api_usage_logs').select('feature, status, latency_ms, estimated_cost_usd, created_at').gte('created_at', since30),
        admin.from('user_progress').select('user_id, progress_percent, is_completed, last_accessed_at, created_at').gte('last_accessed_at', since30),
        admin.from('learning_analytics_events').select('event_name, content_id, is_correct, metadata, occurred_at').gte('occurred_at', since30).in('event_name', ['question_answered', 'question_skipped']),
        admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ])

    const attempts = (attemptResult.data || []) as AttemptRow[]
    const payments = (paymentResult.data || []) as PaymentRow[]
    const sepayRows = (sepayResult.data || []) as SepayWebhookRow[]
    const entitlements = (entitlementResult.data || []) as EntitlementRow[]
    const usage = (usageResult.data || []) as UsageRow[]
    const progressRows = (progressResult.data || []) as ProgressRow[]
    const learningEvents = (learningEventResult.data || []) as LearningEventRow[]
    const authUsers = authResult.data?.users || []
    const completedAttempts = attempts.filter((row) => row.status === 'completed' || Boolean(row.completed_at))
    const started7 = attempts.filter((row) => new Date(row.created_at || row.started_at || 0).getTime() >= new Date(since7).getTime())
    const completed7 = started7.filter((row) => row.status === 'completed' || Boolean(row.completed_at))
    const completionRate = started7.length ? Math.round(completed7.length / started7.length * 100) : 0
    const scoredAttempts = completedAttempts.filter((row) => Number(row.total_points) > 0)
    const averageScore = scoredAttempts.length ? Math.round(scoredAttempts.reduce((sum, row) => sum + Number(row.score || 0) / Number(row.total_points) * 100, 0) / scoredAttempts.length) : 0
    const newUsers7 = authUsers.filter((user) => new Date(user.created_at).getTime() >= new Date(since7).getTime()).length
    const activeUsers7 = authUsers.filter((user) => user.last_sign_in_at && new Date(user.last_sign_in_at).getTime() >= new Date(since7).getTime()).length
    const activeInterviewUsers = new Set(entitlements.filter((row) => row.status === 'active' && new Date(row.expires_at).getTime() > now).map((row) => row.user_id)).size
    const completedPayments = payments.filter((row) => {
        const recognizedAt = row.verified_at || row.created_at
        return row.payment_status === 'completed' && Boolean(recognizedAt) && new Date(recognizedAt!).getTime() >= new Date(since30).getTime()
    })
    const revenue30 = completedPayments.reduce((sum, row) => sum + Number(row.amount_vnd || 0), 0)
    const payingUsers30 = new Set(completedPayments.map((row) => row.user_id)).size
    const distinctTransfers = Array.from(sepayRows.reduce<Map<string, SepayWebhookRow>>((map, row) => {
        const key = row.sepay_id || row.id
        const existing = map.get(key)
        if (!existing || (existing.status !== 'completed' && row.status === 'completed')) map.set(key, row)
        return map
    }, new Map()).values())
    const matchedTransfers = distinctTransfers.filter((row) => row.status === 'completed')
    const transfersNeedingReview = distinctTransfers.filter((row) => row.status !== 'completed')
    const bankIncome30 = distinctTransfers.reduce((sum, row) => sum + Number(row.amount_in || 0), 0)
    const reviewAmount30 = transfersNeedingReview.reduce((sum, row) => sum + Number(row.amount_in || 0), 0)
    const hasSepayDataSource = !sepayResult.error
    const successfulUsage = usage.filter((row) => row.status === 'success')
    const avgLatency = successfulUsage.length ? Math.round(successfulUsage.reduce((sum, row) => sum + Number(row.latency_ms || 0), 0) / successfulUsage.length) : 0
    const aiCost = successfulUsage.reduce((sum, row) => sum + Number(row.estimated_cost_usd || 0), 0)
    const totalLearners = studentResult.count || 0
    const learnersWithProgress = new Set(progressRows.map((row) => row.user_id)).size
    const learnersWithAttempts = new Set(attempts.map((row) => row.user_id)).size
    const learnersCompletedExam = new Set(completedAttempts.map((row) => row.user_id)).size
    const completedLessons = progressRows.filter((row) => row.is_completed).length
    const averageLessonProgress = progressRows.length ? Math.round(progressRows.reduce((sum, row) => sum + Number(row.progress_percent || 0), 0) / progressRows.length) : 0

    const retentionFor = (minimumAge: number, maximumAge: number) => {
        const cohort = authUsers.filter((user) => {
            const age = (now - new Date(user.created_at).getTime()) / DAY
            return age >= minimumAge && age < maximumAge
        })
        const retained = cohort.filter((user) => user.last_sign_in_at && new Date(user.last_sign_in_at).getTime() - new Date(user.created_at).getTime() >= minimumAge * DAY).length
        return { eligible: cohort.length, rate: cohort.length ? Math.round(retained / cohort.length * 100) : 0 }
    }
    const retentionD1 = retentionFor(1, 8)
    const retentionD7 = retentionFor(7, 30)
    const retentionD30 = retentionFor(30, 90)
    const questionQuality = Array.from(learningEvents.reduce<Map<string, { label: string; total: number; wrong: number; skipped: number }>>((map, event) => {
        if (!event.content_id) return map
        const current = map.get(event.content_id) || {
            label: typeof event.metadata?.question_text === 'string' && event.metadata.question_text
                ? event.metadata.question_text
                : `Câu hỏi ${event.content_id.slice(0, 8)}`,
            total: 0,
            wrong: 0,
            skipped: 0,
        }
        current.total += 1
        if (event.event_name === 'question_skipped') current.skipped += 1
        if (event.is_correct === false) current.wrong += 1
        map.set(event.content_id, current)
        return map
    }, new Map()).values()).sort((a, b) => (b.wrong / b.total) - (a.wrong / a.total)).slice(0, 6)

    const trend = Array.from({ length: 14 }, (_, index) => {
        const date = new Date(since14.getTime() + index * DAY)
        const key = date.toISOString().slice(0, 10)
        return {
            key,
            label: `${date.getDate()}/${date.getMonth() + 1}`,
            registrations: authUsers.filter((user) => user.created_at.slice(0, 10) === key).length,
            completions: completedAttempts.filter((row) => (row.completed_at || '').slice(0, 10) === key).length,
        }
    })
    const featureCounts = successfulUsage.reduce<Record<string, number>>((counts, row) => {
        counts[row.feature] = (counts[row.feature] || 0) + 1
        return counts
    }, {})
    const topFeatures = Object.entries(featureCounts).sort((a, b) => b[1] - a[1]).slice(0, 5)
    const maxFeature = Math.max(1, ...topFeatures.map(([, count]) => count))

    const suggestions = [
        ['Giữ chân D1 / D7 / D30', 'Đo người học quay lại sau ngày đăng ký để đánh giá chất lượng onboarding.'],
        ['Phễu học tập', 'Đăng ký → mở bài → hoàn thành bài → thi thử → mua gói.'],
        ['Chất lượng nội dung', 'Câu sai nhiều, câu bị bỏ qua, thời gian trả lời và tỷ lệ học lại.'],
        ['Hiệu quả học tập', 'Mức tăng điểm theo tuần, theo chủ đề, ngành và nhóm/lớp.'],
        ['Doanh thu & chuyển đổi', 'Tỷ lệ mua gói, doanh thu trên người dùng và tỷ lệ gia hạn.'],
        ['Độ ổn định hệ thống', 'Lỗi API/TTS, độ trễ, tỷ lệ tạo giọng thành công và chi phí AI.'],
    ]

    return <div className="space-y-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Analytics</p><h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Tổng quan hoạt động</h2><p className="mt-1 text-sm text-slate-500">Đo lường người dùng, học tập, doanh thu và vận hành hệ thống.</p></div><div className="rounded-xl border bg-white px-3 py-2 text-xs text-slate-500">Dữ liệu hoạt động: 30 ngày gần nhất</div></div>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard hint={`${newUsers7} tài khoản mới trong 7 ngày`} icon={Users} label="Tổng học viên" value={formatNumber.format(studentResult.count || 0)} />
            <MetricCard hint={`${activeUsers7} người đăng nhập trong 7 ngày`} icon={UserCheck} label="Người dùng hoạt động" tone="green" value={activeUsers7} />
            <MetricCard hint={`${completedAttempts.length} lượt hoàn thành trong 30 ngày`} icon={GraduationCap} label="Lượt làm bài" tone="violet" value={attempts.length} />
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between"><div><p className="text-sm font-medium text-slate-600">Đang trực tuyến</p><OnlineUsersCounter /></div><span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Activity className="size-5" /></span></div><p className="mt-2 text-xs text-slate-500">Cập nhật theo thời gian thực</p></div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard hint={`${completed7.length}/${started7.length} lượt trong 7 ngày`} icon={CheckCircle2} label="Tỷ lệ hoàn thành" tone="green" value={`${completionRate}%`} />
            <MetricCard hint={`${scoredAttempts.length} bài có dữ liệu điểm`} icon={Award} label="Điểm trung bình" tone="amber" value={`${averageScore}%`} />
            <MetricCard hint={`${examResult.count || 0} đề thi đang có trong hệ thống`} icon={FileText} label="Nội dung thi" value={`${examResult.count || 0} đề`} />
            <MetricCard hint="Tài khoản có quyền truy cập còn hạn" icon={ShieldCheck} label="Gói Vòng 2 hoạt động" tone="violet" value={activeInterviewUsers} />
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.6fr_0.8fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-5"><h3 className="font-bold text-slate-950">Xu hướng hoạt động 14 ngày</h3><p className="text-sm text-slate-500">So sánh đăng ký mới và bài thi hoàn thành mỗi ngày.</p></div><TrendChart rows={trend} /></div>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-5 py-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold text-slate-950">Đối soát kinh doanh 30 ngày</h3><p className="mt-1 text-xs leading-5 text-slate-500">Tách tiền ngân hàng nhận được và doanh thu đã kích hoạt.</p></div><Banknote className="size-5 shrink-0 text-emerald-600" /></div></div>
                <div className="space-y-3 p-5">
                    <div className="rounded-xl border border-blue-100 bg-blue-50 p-3.5"><p className="text-xs font-semibold text-blue-700">Tiền ngân hàng ghi nhận</p><p className="mt-1 text-2xl font-black text-blue-950">{hasSepayDataSource ? formatMoney(bankIncome30) : 'Chưa có dữ liệu'}</p><p className="mt-1 text-[11px] text-blue-600">{hasSepayDataSource ? `${distinctTransfers.length} chuyển khoản đến từ SePay` : 'Chưa đọc được bảng nhật ký SePay'}</p></div>
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3.5"><div className="flex items-center justify-between gap-2"><p className="text-xs font-semibold text-emerald-700">Doanh thu đã khớp và kích hoạt</p><CheckCircle2 className="size-4 text-emerald-600" /></div><p className="mt-1 text-2xl font-black text-emerald-950">{formatMoney(revenue30)}</p><p className="mt-1 text-[11px] text-emerald-700">{completedPayments.length} đơn · {payingUsers30} người mua · theo ngày xác minh</p></div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-slate-50 p-3"><p className="text-[11px] text-slate-500">SePay đã khớp</p><p className="mt-1 text-lg font-black text-slate-950">{hasSepayDataSource ? matchedTransfers.length : '—'}</p></div>
                        <div className="rounded-xl bg-amber-50 p-3"><p className="text-[11px] text-amber-700">Cần đối soát</p><p className="mt-1 text-lg font-black text-amber-950">{hasSepayDataSource ? transfersNeedingReview.length : '—'}</p><p className="text-[10px] text-amber-700">{hasSepayDataSource ? formatMoney(reviewAmount30) : ''}</p></div>
                    </div>
                    {transfersNeedingReview.length > 0 ? <Link className="flex items-center justify-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 transition hover:bg-amber-100" href="/admin/sepay-logs"><AlertTriangle className="size-4" />Xem giao dịch cần đối soát</Link> : null}
                </div>
            </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-5"><h3 className="font-bold text-slate-950">Phễu chuyển đổi 30 ngày</h3><p className="text-sm text-slate-500">Theo dõi người học từ khi có tài khoản đến lúc học, thi và thanh toán.</p></div>
                <div className="space-y-5">
                    <FunnelStep detail="Toàn bộ tài khoản học viên" label="Học viên" total={totalLearners} value={totalLearners} />
                    <FunnelStep detail="Có tiến độ bài học" label="Bắt đầu học" total={totalLearners} value={learnersWithProgress} />
                    <FunnelStep detail="Có ít nhất một lượt thi" label="Bắt đầu thi" total={totalLearners} value={learnersWithAttempts} />
                    <FunnelStep detail="Hoàn thành ít nhất một bài" label="Hoàn thành thi" total={totalLearners} value={learnersCompletedExam} />
                    <FunnelStep detail="Thanh toán thành công" label="Trở thành khách hàng" total={totalLearners} value={payingUsers30} />
                </div>
                <p className="mt-5 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">Lưu ý: bước học, thi và thanh toán đang tính trên dữ liệu phát sinh trong 30 ngày; tổng học viên là toàn hệ thống.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="font-bold text-slate-950">Tỷ lệ quay lại</h3><p className="text-sm text-slate-500">Ước tính dựa trên ngày tạo tài khoản và lần đăng nhập gần nhất.</p>
                <div className="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                    <RetentionCard description="Quay lại ít nhất sau 1 ngày." eligible={retentionD1.eligible} label="D1" value={retentionD1.rate} />
                    <RetentionCard description="Quay lại ít nhất sau 7 ngày." eligible={retentionD7.eligible} label="D7" value={retentionD7.rate} />
                    <RetentionCard description="Quay lại ít nhất sau 30 ngày." eligible={retentionD30.eligible} label="D30" value={retentionD30.rate} />
                </div>
            </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-bold text-slate-950">Tiến độ học tập 30 ngày</h3><p className="text-sm text-slate-500">Tổng hợp từ tiến độ các bài học đã được ghi nhận.</p></div><div className="grid grid-cols-3 gap-2 text-center"><div className="rounded-xl bg-blue-50 px-4 py-3"><strong className="block text-lg text-blue-800">{learnersWithProgress}</strong><span className="text-xs text-blue-600">Người học</span></div><div className="rounded-xl bg-emerald-50 px-4 py-3"><strong className="block text-lg text-emerald-800">{completedLessons}</strong><span className="text-xs text-emerald-600">Bài hoàn thành</span></div><div className="rounded-xl bg-violet-50 px-4 py-3"><strong className="block text-lg text-violet-800">{averageLessonProgress}%</strong><span className="text-xs text-violet-600">Tiến độ TB</span></div></div></div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><h3 className="font-bold text-slate-950">Chất lượng câu hỏi</h3><p className="text-sm text-slate-500">Những câu có tỷ lệ sai hoặc bỏ qua cao trong 30 ngày.</p></div><span className="text-xs text-slate-400">{formatNumber.format(learningEvents.length)} lượt trả lời được ghi nhận</span></div>
            {questionQuality.length ? <div className="mt-5 divide-y divide-slate-100">{questionQuality.map((question, index) => {
                const wrongRate = Math.round(question.wrong / question.total * 100)
                return <div className="grid gap-3 py-4 sm:grid-cols-[36px_1fr_160px] sm:items-center" key={`${question.label}-${index}`}><span className="grid size-8 place-items-center rounded-lg bg-red-50 text-xs font-bold text-red-600">{index + 1}</span><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{question.label}</p><p className="mt-1 text-xs text-slate-400">{question.total} lượt · {question.skipped} bỏ qua</p></div><div><div className="mb-1 flex justify-between text-xs"><span className="text-slate-500">Sai hoặc bỏ qua</span><strong className="text-red-600">{wrongRate}%</strong></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-red-400" style={{ width: `${wrongRate}%` }} /></div></div></div>
            })}</div> : <div className="mt-5 rounded-xl border border-dashed border-slate-200 py-10 text-center"><p className="text-sm font-medium text-slate-600">Chưa có dữ liệu cấp câu hỏi</p><p className="mt-1 text-xs text-slate-400">Dữ liệu sẽ xuất hiện sau khi migration Analytics được áp dụng và học viên nộp bài mới.</p></div>}
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><div><h3 className="font-bold text-slate-950">Sử dụng AI</h3><p className="text-sm text-slate-500">30 ngày gần nhất</p></div><BrainCircuit className="size-5 text-violet-600" /></div><div className="mt-4 grid grid-cols-3 gap-2"><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Thành công</p><p className="mt-1 text-lg font-black">{successfulUsage.length}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Độ trễ TB</p><p className="mt-1 text-lg font-black">{avgLatency}ms</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Chi phí ước tính</p><p className="mt-1 text-lg font-black">${aiCost.toFixed(2)}</p></div></div><div className="mt-5 space-y-3">{topFeatures.length ? topFeatures.map(([feature, count]) => <div key={feature}><div className="mb-1 flex justify-between text-xs"><span className="font-medium text-slate-700">{feature}</span><span className="text-slate-400">{count}</span></div><div className="h-2 rounded-full bg-slate-100"><div className="h-full rounded-full bg-violet-500" style={{ width: `${count / maxFeature * 100}%` }} /></div></div>) : <p className="py-6 text-center text-sm text-slate-400">Chưa có dữ liệu sử dụng AI.</p>}</div></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><div><h3 className="font-bold text-slate-950">Sức khỏe hệ thống</h3><p className="text-sm text-slate-500">Chỉ số vận hành AI/API</p></div><Gauge className="size-5 text-blue-600" /></div><div className="mt-5 space-y-3"><div className="flex items-center justify-between rounded-xl bg-slate-50 p-3"><span className="text-sm text-slate-600">Tỷ lệ API AI thành công</span><strong>{usage.length ? Math.round(successfulUsage.length / usage.length * 100) : 0}%</strong></div><div className="flex items-center justify-between rounded-xl bg-slate-50 p-3"><span className="text-sm text-slate-600">Yêu cầu thất bại</span><strong className="text-red-600">{usage.length - successfulUsage.length}</strong></div><div className="flex items-center justify-between rounded-xl bg-slate-50 p-3"><span className="text-sm text-slate-600">Độ trễ trung bình</span><strong>{avgLatency} ms</strong></div></div></div>
        </section>

        <section className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5"><div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-600 text-white"><Lightbulb className="size-5" /></span><div><h3 className="font-bold text-slate-950">Các nhóm thống kê nên bổ sung tiếp</h3><p className="text-sm text-slate-600">Những chỉ số dưới đây cần ghi thêm sự kiện học tập để đo chính xác.</p></div></div><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{suggestions.map(([title, description]) => <div className="rounded-xl border border-blue-100 bg-white p-4" key={title}><div className="flex items-center gap-2"><TrendingUp className="size-4 text-blue-600" /><h4 className="text-sm font-bold text-slate-900">{title}</h4></div><p className="mt-2 text-xs leading-5 text-slate-500">{description}</p></div>)}</div></section>
    </div>
}
