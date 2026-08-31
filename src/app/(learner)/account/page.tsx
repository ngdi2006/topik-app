"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Award, CalendarDays, CheckCircle2, ChevronLeft, Clock3, History, Loader2, LockKeyhole, Mail, Menu, Save, ShieldCheck, UserRound, XCircle } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { useUserStore } from "@/store/userStore"
import { UserNav } from "@/components/shared/UserNav"
import { LearnerSidebar } from "@/components/shared/LearnerSidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type HistoryRecord = {
    id: string
    type: "exam" | "milestone"
    score: number
    raw_score?: number
    total_points?: number
    total_correct: number
    wrong_count?: number
    time_taken?: number
    created_at: string
    attempt_number?: number
    exams?: { title?: string; level?: string } | null
}

type ProfileRecord = {
    full_name: string | null
    group_name: string | null
    avatar_url: string | null
    role: string | null
}

const historyDateFormatter = new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
})

export default function AccountPage() {
    const router = useRouter()
    const supabase = useMemo(() => createClient(), [])
    const { user: storedUser, role: storedRole, setUser } = useUserStore()
    const [profile, setProfile] = useState<ProfileRecord | null>(null)
    const [history, setHistory] = useState<HistoryRecord[]>([])
    const [fullName, setFullName] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [isLoading, setIsLoading] = useState(true)
    const [isSavingProfile, setIsSavingProfile] = useState(false)
    const [isSavingPassword, setIsSavingPassword] = useState(false)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

    useEffect(() => {
        router.prefetch('/dashboard')
    }, [router])

    const handleBack = () => {
        const returnPath = window.sessionStorage.getItem('account:return-path')
        window.sessionStorage.removeItem('account:return-path')
        if (returnPath?.startsWith('/')) {
            router.replace(returnPath)
            return
        }
        if (window.history.length > 1) {
            router.back()
            return
        }
        router.replace('/dashboard')
    }

    useEffect(() => {
        let active = true
        const loadAccount = async () => {
            const userPromise = storedUser
                ? Promise.resolve(storedUser)
                : supabase.auth.getUser().then(({ data }) => data.user)
            const historyPromise = fetch('/api/learner/history', { cache: 'no-store' })
                .then(async (response) => response.ok ? response.json() as Promise<HistoryRecord[]> : [])

            const [currentUser, historyData] = await Promise.all([userPromise, historyPromise])
            if (!active) return
            if (!currentUser) {
                router.replace('/login?next=/account')
                return
            }

            setUser(currentUser)
            const { data: profileData } = await supabase
                .from('profiles')
                .select('full_name, group_name, avatar_url, role')
                .eq('id', currentUser.id)
                .maybeSingle()
            if (!active) return
            const normalizedProfile = profileData as ProfileRecord | null
            setProfile(normalizedProfile)
            setFullName(normalizedProfile?.full_name || currentUser.user_metadata?.full_name || '')
            setHistory(Array.isArray(historyData) ? historyData : [])
            setIsLoading(false)
        }
        void loadAccount()
        return () => { active = false }
    }, [router, setUser, storedUser, supabase])

    const saveProfile = async (event: React.FormEvent) => {
        event.preventDefault()
        if (!fullName.trim()) return
        setIsSavingProfile(true)
        const { data, error } = await supabase.auth.updateUser({ data: { full_name: fullName.trim() } })
        if (!error && data.user) {
            await supabase.from('profiles').update({ full_name: fullName.trim() }).eq('id', data.user.id)
            setUser(data.user)
            setProfile((current) => current ? { ...current, full_name: fullName.trim() } : current)
            toast.success('Đã cập nhật thông tin cá nhân')
        } else {
            toast.error(error?.message || 'Không thể cập nhật thông tin')
        }
        setIsSavingProfile(false)
    }

    const savePassword = async (event: React.FormEvent) => {
        event.preventDefault()
        if (newPassword.length < 6) return toast.error('Mật khẩu cần có ít nhất 6 ký tự')
        if (newPassword !== confirmPassword) return toast.error('Mật khẩu xác nhận chưa khớp')
        setIsSavingPassword(true)
        const { error } = await supabase.auth.updateUser({ password: newPassword })
        if (error) toast.error(error.message)
        else {
            toast.success('Đã cập nhật mật khẩu')
            setNewPassword('')
            setConfirmPassword('')
        }
        setIsSavingPassword(false)
    }

    const user = storedUser
    const role = profile?.role || storedRole || 'learner'
    const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Học viên'
    const initials = String(displayName).trim().split(/\s+/).slice(-2).map((part: string) => part[0]).join('').toUpperCase()
    const examHistory = history.filter((record) => record.type === 'exam')
    const averageScore = examHistory.length
        ? Math.round(examHistory.reduce((sum, record) => sum + Number(record.score || 0), 0) / examHistory.length)
        : 0

    return (
        <div className="flex min-h-screen bg-slate-50">
            <LearnerSidebar mobileOpen={isMobileMenuOpen} onMobileOpenChange={setIsMobileMenuOpen} />
            <div className="min-w-0 flex-1">
            <header className="sticky top-0 z-20 border-b bg-white/95 backdrop-blur">
                <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
                    <div className="flex items-center gap-2">
                        <Button aria-label="Mở menu" className="md:hidden" onClick={() => setIsMobileMenuOpen(true)} size="icon" variant="ghost"><Menu className="size-6" /></Button>
                        <Button aria-label="Quay lại" onClick={handleBack} size="icon" variant="ghost"><ChevronLeft className="size-5" /></Button>
                        <div><p className="font-bold text-slate-900">Tài khoản của tôi</p><p className="hidden text-xs text-slate-500 sm:block">Thông tin, bảo mật và lịch sử học tập</p></div>
                    </div>
                    <UserNav />
                </div>
            </header>

            <main className="mx-auto w-full max-w-6xl space-y-4 p-4 sm:space-y-6 sm:p-6 lg:p-8">
                <section className="relative overflow-hidden rounded-[22px] border border-blue-500/20 bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-700 p-4 text-white shadow-[0_14px_36px_rgba(37,99,235,0.22)] sm:rounded-3xl sm:p-7">
                    <div aria-hidden="true" className="absolute -right-12 -top-16 size-40 rounded-full bg-white/10 blur-2xl" />
                    <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
                        <div className="flex min-w-0 items-center gap-4">
                            <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white/15 text-lg font-black shadow-inner ring-1 ring-white/30 sm:size-16 sm:text-xl">
                                {profile?.avatar_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img alt="" className="size-full object-cover" src={profile.avatar_url} />
                                ) : initials}
                            </div>
                            <div className="min-w-0"><h1 className="truncate text-xl font-black sm:text-2xl">{displayName}</h1><p className="truncate text-xs text-blue-100 sm:text-sm">{user?.email}</p><span className="mt-1.5 inline-flex rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-bold uppercase ring-1 ring-white/10 sm:mt-2 sm:py-1 sm:text-[11px]">{role}</span></div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:min-w-72">
                            <div className="rounded-xl bg-white/10 px-3 py-2.5 ring-1 ring-white/10 backdrop-blur-sm sm:rounded-2xl sm:p-3"><p className="text-[10px] text-blue-100 sm:text-xs">Bài thi đã làm</p><p className="mt-0.5 text-lg font-black tabular-nums sm:mt-1 sm:text-xl">{examHistory.length}</p></div>
                            <div className="rounded-xl bg-white/10 px-3 py-2.5 ring-1 ring-white/10 backdrop-blur-sm sm:rounded-2xl sm:p-3"><p className="text-[10px] text-blue-100 sm:text-xs">Điểm trung bình</p><p className="mt-0.5 text-lg font-black tabular-nums sm:mt-1 sm:text-xl">{averageScore}%</p></div>
                        </div>
                    </div>
                </section>

                <Tabs defaultValue="history" className="w-full">
                    <TabsList className="!grid h-11 w-full grid-cols-3 items-stretch gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
                        <TabsTrigger className="h-full min-w-0 gap-1 rounded-xl px-1 text-[11px] font-bold text-slate-500 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-blue-200 sm:gap-1.5 sm:text-sm" value="history"><span className="grid size-5 shrink-0 place-items-center rounded-md bg-slate-100 text-slate-600 group-data-[state=active]:bg-white/15 group-data-[state=active]:text-white"><History className="size-3.5" /></span><span className="truncate">Lịch sử</span></TabsTrigger>
                        <TabsTrigger className="h-full min-w-0 gap-1 rounded-xl px-1 text-[11px] font-bold text-slate-500 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-blue-200 sm:gap-1.5 sm:text-sm" value="overview"><span className="grid size-5 shrink-0 place-items-center rounded-md bg-slate-100 text-slate-600 group-data-[state=active]:bg-white/15 group-data-[state=active]:text-white"><UserRound className="size-3.5" /></span><span className="truncate">Tổng quan</span></TabsTrigger>
                        <TabsTrigger className="h-full min-w-0 gap-1 rounded-xl px-1 text-[11px] font-bold text-slate-500 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-blue-200 sm:gap-1.5 sm:text-sm" value="security"><span className="grid size-5 shrink-0 place-items-center rounded-md bg-slate-100 text-slate-600 group-data-[state=active]:bg-white/15 group-data-[state=active]:text-white"><LockKeyhole className="size-3.5" /></span><span className="truncate">Bảo mật</span></TabsTrigger>
                    </TabsList>

                    <TabsContent className="mt-5" value="overview">
                        <div className="grid gap-5 lg:grid-cols-[1fr_0.7fr]">
                            <Card><CardHeader><CardTitle>Thông tin cá nhân</CardTitle><CardDescription>Cập nhật tên hiển thị của bạn.</CardDescription></CardHeader><CardContent><form className="space-y-4" onSubmit={saveProfile}><div className="space-y-2"><Label htmlFor="account-email">Email</Label><Input disabled id="account-email" value={user?.email || ''} /></div><div className="space-y-2"><Label htmlFor="account-name">Họ và tên</Label><Input id="account-name" onChange={(event) => setFullName(event.target.value)} required value={fullName} /></div><Button disabled={isSavingProfile} type="submit">{isSavingProfile ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}Lưu thay đổi</Button></form></CardContent></Card>
                            <Card><CardHeader><CardTitle>Thông tin tài khoản</CardTitle></CardHeader><CardContent className="space-y-4 text-sm"><div className="flex items-center gap-3"><Mail className="size-5 text-blue-600" /><div><p className="text-slate-500">Email</p><p className="font-semibold">{user?.email || '—'}</p></div></div><div className="flex items-center gap-3"><ShieldCheck className="size-5 text-emerald-600" /><div><p className="text-slate-500">Vai trò</p><p className="font-semibold capitalize">{role}</p></div></div><div className="flex items-center gap-3"><UserRound className="size-5 text-violet-600" /><div><p className="text-slate-500">Nhóm/Lớp</p><p className="font-semibold">{profile?.group_name || 'Chưa phân nhóm'}</p></div></div></CardContent></Card>
                        </div>
                    </TabsContent>

                    <TabsContent className="mt-5" value="security">
                        <Card className="max-w-2xl"><CardHeader><CardTitle>Đổi mật khẩu</CardTitle><CardDescription>Sử dụng mật khẩu mới có ít nhất 6 ký tự.</CardDescription></CardHeader><CardContent><form className="space-y-4" onSubmit={savePassword}><div className="space-y-2"><Label htmlFor="new-password">Mật khẩu mới</Label><Input autoComplete="new-password" id="new-password" minLength={6} onChange={(event) => setNewPassword(event.target.value)} type="password" value={newPassword} /></div><div className="space-y-2"><Label htmlFor="confirm-password">Xác nhận mật khẩu</Label><Input autoComplete="new-password" id="confirm-password" minLength={6} onChange={(event) => setConfirmPassword(event.target.value)} type="password" value={confirmPassword} /></div><Button disabled={isSavingPassword} type="submit">{isSavingPassword ? <Loader2 className="size-4 animate-spin" /> : <LockKeyhole className="size-4" />}Cập nhật mật khẩu</Button></form></CardContent></Card>
                    </TabsContent>

                    <TabsContent className="mt-4" value="history">
                        <Card className="overflow-hidden rounded-[22px] border-slate-200 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.07)]"><CardHeader className="gap-1 border-b border-slate-100 bg-gradient-to-r from-blue-50/80 via-white to-indigo-50/50 px-4 py-4 sm:px-5"><CardTitle className="flex items-center gap-2 text-base sm:text-lg"><span className="grid size-8 place-items-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-200"><History className="size-4" /></span>Lịch sử học tập</CardTitle><CardDescription className="pl-10 text-xs sm:text-sm">Danh sách các bài thi và bài kiểm tra đã hoàn thành.</CardDescription></CardHeader><CardContent className="p-0">
                            {isLoading ? <div className="grid min-h-48 place-items-center"><Loader2 className="size-7 animate-spin text-blue-600" /></div> : history.length === 0 ? <div className="p-12 text-center text-sm text-slate-500">Bạn chưa có lịch sử học tập.</div> : <div className="divide-y">{history.map((record) => {
                                const minutes = Math.floor(Number(record.time_taken || 0) / 60)
                                const hasPointScale = record.type === 'exam' && typeof record.raw_score === 'number' && typeof record.total_points === 'number' && record.total_points > 0
                                return <article className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 transition-colors hover:bg-blue-50/40 sm:px-5 sm:py-4" key={record.id}>
                                    <div className="min-w-0">
                                        <div className="flex min-w-0 items-center gap-2">
                                            <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-bold uppercase text-blue-700 sm:text-[10px]">{record.type === 'exam' ? 'Bài thi' : 'Mốc học'}</span>
                                            {record.attempt_number ? <span className="truncate text-[10px] text-slate-400">Lần {record.attempt_number}</span> : null}
                                        </div>
                                        <h3 className="mt-1.5 truncate text-sm font-bold text-slate-900 sm:text-base">{record.exams?.title || 'Bài kiểm tra'}</h3>
                                        <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] text-slate-500 sm:text-xs">
                                            <span className="inline-flex items-center gap-1"><CalendarDays className="size-3.5" />{historyDateFormatter.format(new Date(record.created_at))}</span>
                                            {record.time_taken ? <span className="inline-flex items-center gap-1"><Clock3 className="size-3.5" />{minutes || 1} phút</span> : null}
                                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-600"><CheckCircle2 className="size-3.5" />{record.total_correct || 0} đúng</span>
                                            {typeof record.wrong_count === 'number' ? <span className="inline-flex items-center gap-1 font-semibold text-red-500"><XCircle className="size-3.5" />{record.wrong_count} sai</span> : null}
                                        </div>
                                    </div>
                                    <div className="flex min-w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 px-2.5 py-2 text-center shadow-sm ring-1 ring-blue-100">
                                        <Award className="mb-0.5 size-4 text-amber-500" />
                                        <strong className="text-base font-black leading-none text-blue-700 sm:text-lg">{Number(record.score || 0)}{record.type === 'exam' ? '%' : ''}</strong>
                                        <span className="mt-1 text-[9px] font-semibold leading-none text-slate-500">{hasPointScale ? `${record.raw_score}/${record.total_points} điểm` : record.type === 'milestone' ? 'điểm' : 'kết quả'}</span>
                                    </div>
                                </article>
                            })}</div>}
                        </CardContent></Card>
                    </TabsContent>
                </Tabs>
            </main>
            </div>
        </div>
    )
}
