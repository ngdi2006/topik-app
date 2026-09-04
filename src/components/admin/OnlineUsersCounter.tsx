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

    useEffect(() => {
        const supabase = createClient()
        const channel = supabase.channel('global-presence')
        channel.on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState()
            setUsers(Object.entries(state).map(([key, presences]) => ({
                key,
                ...((presences as unknown as PresenceEntry[]).at(-1) || {}),
            })))
        }).subscribe()
        return () => { void supabase.removeChannel(channel) }
    }, [])

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
            <span className="block text-2xl font-bold text-emerald-500">{users.length}</span>
            <span className="mt-1 block text-[11px] font-semibold text-blue-600 group-hover:underline">Xem vị trí và hoạt động</span>
        </button>

        {open ? <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm" onMouseDown={() => setOpen(false)}>
            <section aria-label="Người dùng đang trực tuyến" className="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
                <header className="flex items-start justify-between border-b border-slate-100 p-5">
                    <div><h2 className="text-lg font-black text-slate-950">Người dùng đang trực tuyến</h2><p className="mt-1 text-xs text-slate-500">Vị trí được ước tính theo kết nối mạng, không phải GPS chính xác.</p></div>
                    <button aria-label="Đóng" className="grid size-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100" onClick={() => setOpen(false)} type="button"><X className="size-5" /></button>
                </header>

                <div className="grid gap-3 border-b border-slate-100 bg-slate-50/70 p-4 sm:grid-cols-3">
                    <Summary label="Tổng trực tuyến" tone="text-emerald-600" value={users.length} />
                    <Summary label="Đã đăng nhập" value={users.filter((user) => !user.is_guest).length} />
                    <Summary label="Khu vực ghi nhận" value={locations.filter(([name]) => name !== 'Không xác định').length} />
                </div>

                <div className="max-h-[58vh] overflow-y-auto p-4">
                    {locations.length ? <div className="mb-4 flex flex-wrap gap-2">{locations.map(([name, count]) => <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700" key={name}><MapPin className="size-3.5" />{name} · {count}</span>)}</div> : null}
                    <div className="overflow-hidden rounded-xl border border-slate-200">
                        {users.length ? users.map((user, index) => <UserRow index={index} key={user.key} user={user} />) : <div className="p-8 text-center"><Laptop className="mx-auto size-8 text-slate-300" /><p className="mt-2 text-sm text-slate-500">Chưa có người dùng trực tuyến</p></div>}
                    </div>
                </div>
            </section>
        </div> : null}
    </>
}

function Summary({ label, value, tone = 'text-slate-950' }: { label: string; value: number; tone?: string }) {
    return <div className="rounded-xl bg-white p-3 shadow-sm"><p className="text-xs text-slate-500">{label}</p><strong className={`mt-1 block text-xl ${tone}`}>{value}</strong></div>
}

function UserRow({ user, index }: { user: PresenceEntry; index: number }) {
    const DeviceIcon = user.device === 'mobile' ? Smartphone : user.device === 'tablet' ? MonitorSmartphone : Laptop
    const device = user.device === 'mobile' ? 'Điện thoại' : user.device === 'tablet' ? 'Máy tính bảng' : 'Máy tính'
    return <div className={`grid gap-2 p-3 sm:grid-cols-[1fr_1.15fr_1fr] sm:items-center ${index ? 'border-t border-slate-100' : ''}`}>
        <div><p className="text-sm font-bold text-slate-900">{user.is_guest ? 'Khách' : 'Người dùng đăng nhập'}</p><p className="text-[11px] text-slate-400">{user.key.slice(0, 8)}…</p></div>
        <div><p className="flex items-center gap-1.5 text-xs font-medium text-slate-700"><MapPin className="size-3.5 text-blue-500" />{locationName(user)}</p><p className="mt-1 text-[11px] text-slate-500">{pageName(user.current_page)}</p></div>
        <div className="flex items-center gap-2 text-xs text-slate-600 sm:justify-end"><DeviceIcon className="size-4 text-slate-400" /><span>{device} · {user.browser || 'Khác'}</span></div>
    </div>
}
