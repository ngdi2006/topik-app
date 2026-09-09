'use client'

import { useEffect, useMemo, useState } from 'react'
import { Laptop, MapPin, MonitorSmartphone, Smartphone, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type PresenceEntry = {
    key: string
    online_at?: string
    is_guest?: boolean
    current_page?: string
    country?: string | null
    region?: string | null
    city?: string | null
    device?: 'desktop' | 'tablet' | 'mobile'
    browser?: string
}

type ConnectionStatus = 'connecting' | 'connected' | 'error'
type UserIdentity = { id: string; name: string; email: string | null; role: string; groupName: string | null }

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const PAGE_NAMES: Record<string, string> = {
    '/dashboard': 'Tổng quan học tập',
    '/account': 'Tài khoản',
    '/textbooks': 'Giáo trình EPS-TOPIK',
    '/exam': 'Thi thử EPS-TOPIK',
    '/interview': 'Phỏng vấn Vòng 2',
    '/admin': 'Trang quản trị',
}

function pageName(path = '') {
    return Object.entries(PAGE_NAMES).find(([prefix]) => path === prefix || path.startsWith(`${prefix}/`))?.[1] || 'Trang khác'
}

function locationName(entry: PresenceEntry) {
    return [entry.city, entry.region, entry.country]
        .filter((value, index, values) => value && values.indexOf(value) === index)
        .join(', ') || 'Không xác định'
}

export function OnlineUsersCounter() {
    const [users, setUsers] = useState<PresenceEntry[]>([])
    const [open, setOpen] = useState(false)
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting')
    const [identities, setIdentities] = useState<Record<string, UserIdentity>>({})

    useEffect(() => {
        const supabase = createClient()
        let channel: ReturnType<typeof supabase.channel> | null = null
        let retryTimer: ReturnType<typeof setTimeout> | null = null
        let disposed = false

        const connect = () => {
            if (disposed || document.hidden) return
            setConnectionStatus('connecting')
            const nextChannel = supabase.channel('global-presence')
            channel = nextChannel
            nextChannel.on('presence', { event: 'sync' }, () => {
                const state = nextChannel.presenceState()
                setUsers(Object.entries(state).map(([key, presences]) => ({
                    key,
                    ...((presences as unknown as PresenceEntry[]).at(-1) || {}),
                })))
            }).subscribe((status) => {
                if (disposed) return
                if (status === 'SUBSCRIBED') {
                    setConnectionStatus('connected')
                    return
                }
                if (status !== 'CHANNEL_ERROR' && status !== 'TIMED_OUT' && status !== 'CLOSED') return
                setConnectionStatus('error')
                if (retryTimer) clearTimeout(retryTimer)
                retryTimer = setTimeout(() => {
                    if (channel === nextChannel) channel = null
                    void supabase.removeChannel(nextChannel)
                    connect()
                }, 3000)
            })
        }

        const handleVisibilityChange = () => {
            if (document.hidden) return
            if (!channel) connect()
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)
        connect()
        return () => {
            disposed = true
            document.removeEventListener('visibilitychange', handleVisibilityChange)
            if (retryTimer) clearTimeout(retryTimer)
            if (channel) void supabase.removeChannel(channel)
        }
    }, [])

    const signedInUserIds = useMemo(
        () => users.filter((user) => !user.is_guest && UUID_PATTERN.test(user.key)).map((user) => user.key).sort(),
        [users],
    )
    useEffect(() => {
        if (!open || !signedInUserIds.length) return
        const missingIds = signedInUserIds.filter((id) => !identities[id]).slice(0, 50)
        if (!missingIds.length) return
        const controller = new AbortController()
        void fetch('/api/admin/online-users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userIds: missingIds }),
            signal: controller.signal,
        }).then(async (response) => {
            if (!response.ok) return
            const data = await response.json() as { users?: UserIdentity[] }
            setIdentities((current) => Object.fromEntries([
                ...Object.entries(current),
                ...(data.users || []).map((identity) => [identity.id, identity] as const),
            ]))
        }).catch(() => undefined)
        return () => controller.abort()
    }, [identities, open, signedInUserIds])

    const locations = useMemo(() => {
        const counts = new Map<string, number>()
        users.forEach((user) => {
            const location = locationName(user)
            counts.set(location, (counts.get(location) || 0) + 1)
        })
        return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])
    }, [users])

    return <>
        <button className="group mt-2 text-left" onClick={() => setOpen(true)} type="button">
            <span className={`block text-2xl font-bold ${connectionStatus === 'error' ? 'text-amber-500' : 'text-emerald-500'}`}>{connectionStatus === 'connected' ? users.length : '—'}</span>
            <span className="mt-1 block text-[11px] font-semibold text-blue-600 group-hover:underline">Xem vị trí và hoạt động</span>
            <span className={`mt-1 block text-[10px] ${connectionStatus === 'error' ? 'text-amber-600' : 'text-slate-400'}`}>{connectionStatus === 'connected' ? 'Đã kết nối thời gian thực' : connectionStatus === 'error' ? 'Mất kết nối — đang thử lại' : 'Đang kết nối...'}</span>
        </button>

        {open ? <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm" onMouseDown={() => setOpen(false)}>
            <section aria-label="Người dùng đang trực tuyến" className="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
                <header className="flex items-start justify-between border-b border-slate-100 p-5">
                    <div><h2 className="text-lg font-black text-slate-950">Người dùng đang trực tuyến</h2><p className="mt-1 text-xs text-slate-500">Vị trí được ước tính theo kết nối mạng, không phải GPS chính xác.</p></div>
                    <button aria-label="Đóng" className="grid size-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100" onClick={() => setOpen(false)} type="button"><X className="size-5" /></button>
                </header>

                <div className="grid gap-3 border-b border-slate-100 bg-slate-50/70 p-4 sm:grid-cols-3">
                    <Summary label="Tổng trực tuyến" tone="text-emerald-600" value={connectionStatus === 'connected' ? users.length : null} />
                    <Summary label="Đã đăng nhập" value={users.filter((user) => !user.is_guest).length} />
                    <Summary label="Khu vực ghi nhận" value={locations.filter(([name]) => name !== 'Không xác định').length} />
                </div>

                <div className="max-h-[58vh] overflow-y-auto p-4">
                    {locations.length ? <div className="mb-4 flex flex-wrap gap-2">{locations.map(([name, count]) => <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700" key={name}><MapPin className="size-3.5" />{name} · {count}</span>)}</div> : null}
                    <div className="overflow-hidden rounded-xl border border-slate-200">
                        {connectionStatus !== 'connected' ? <div className="p-8 text-center"><Laptop className="mx-auto size-8 text-amber-300" /><p className="mt-2 text-sm font-semibold text-amber-700">Chưa kết nối được dữ liệu trực tuyến</p><p className="mt-1 text-xs text-slate-500">Hệ thống đang tự động thử lại.</p></div> : users.length ? users.map((user, index) => <UserRow identity={identities[user.key]} index={index} key={user.key} user={user} />) : <div className="p-8 text-center"><Laptop className="mx-auto size-8 text-slate-300" /><p className="mt-2 text-sm text-slate-500">Chưa có người dùng trực tuyến</p></div>}
                    </div>
                </div>
            </section>
        </div> : null}
    </>
}

function Summary({ label, value, tone = 'text-slate-950' }: { label: string; value: number | null; tone?: string }) {
    return <div className="rounded-xl bg-white p-3 shadow-sm"><p className="text-xs text-slate-500">{label}</p><strong className={`mt-1 block text-xl ${tone}`}>{value ?? '—'}</strong></div>
}

function UserRow({ user, identity, index }: { user: PresenceEntry; identity?: UserIdentity; index: number }) {
    const DeviceIcon = user.device === 'mobile' ? Smartphone : user.device === 'tablet' ? MonitorSmartphone : Laptop
    const device = user.device === 'mobile' ? 'Điện thoại' : user.device === 'tablet' ? 'Máy tính bảng' : 'Máy tính'
    return <div className={`grid gap-2 p-3 sm:grid-cols-[1fr_1.15fr_1fr] sm:items-center ${index ? 'border-t border-slate-100' : ''}`}>
        <div className="min-w-0"><p className="truncate text-sm font-bold text-slate-900">{user.is_guest ? 'Khách' : identity?.name || 'Đang tải thông tin...'}</p><p className="truncate text-[11px] text-slate-400">{user.is_guest ? `${user.key.slice(0, 12)}…` : identity?.email || `${user.key.slice(0, 8)}…`}</p>{identity?.groupName ? <p className="mt-0.5 truncate text-[10px] font-semibold text-blue-600">Lớp: {identity.groupName}</p> : null}</div>
        <div><p className="flex items-center gap-1.5 text-xs font-medium text-slate-700"><MapPin className="size-3.5 text-blue-500" />{locationName(user)}</p><p className="mt-1 text-[11px] text-slate-500">{pageName(user.current_page)}</p></div>
        <div className="flex items-center gap-2 text-xs text-slate-600 sm:justify-end"><DeviceIcon className="size-4 text-slate-400" /><span>{device} · {user.browser || 'Khác'}</span></div>
    </div>
}
