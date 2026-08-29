"use client"

import { useState } from "react"
import { CalendarDays, Clock3, Crown, Medal, Star, Trophy } from "lucide-react"

interface LeaderboardUser {
    rank: number
    name: string
    score: number
    time: string
    avatar: string
}

interface LeaderboardProps {
    leaderboard: LeaderboardUser[]
    currentUserRank: { rank: number | string; score: number; time: string } | null
}

const PODIUM_STYLE = {
    1: {
        order: "md:order-2",
        card: "border-amber-300 bg-gradient-to-b from-amber-50/90 via-white to-amber-50 shadow-amber-200/40 md:-translate-y-5",
        rank: "bg-gradient-to-br from-amber-300 to-orange-500 text-white",
        avatar: "border-amber-200 bg-amber-50",
        score: "border-amber-200 bg-amber-100/80 text-amber-800",
        medal: "text-amber-500",
    },
    2: {
        order: "md:order-1",
        card: "border-blue-200 bg-gradient-to-b from-blue-50/80 via-white to-slate-50 shadow-blue-200/30",
        rank: "bg-gradient-to-br from-slate-200 to-slate-400 text-slate-800",
        avatar: "border-slate-200 bg-slate-50",
        score: "border-blue-100 bg-blue-50 text-blue-700",
        medal: "text-slate-400",
    },
    3: {
        order: "md:order-3",
        card: "border-orange-200 bg-gradient-to-b from-orange-50/80 via-white to-rose-50/40 shadow-orange-200/30",
        rank: "bg-gradient-to-br from-orange-300 to-orange-600 text-white",
        avatar: "border-orange-200 bg-orange-50",
        score: "border-orange-100 bg-orange-50 text-orange-700",
        medal: "text-orange-500",
    },
} as const

function PodiumCard({ user }: { user: LeaderboardUser }) {
    const style = PODIUM_STYLE[user.rank as 1 | 2 | 3]
    if (!style) return null

    return (
        <article className={`relative flex min-h-[220px] flex-col items-center rounded-3xl border p-4 text-center shadow-xl transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-2xl motion-reduce:transform-none ${style.order} ${style.card}`}>
            {user.rank === 1 ? <Crown aria-hidden="true" className="absolute -top-8 size-10 rotate-[-8deg] fill-amber-300 text-amber-500 drop-shadow-md" /> : null}
            <span className={`absolute -top-4 grid size-9 place-items-center rounded-full text-sm font-black shadow-md ring-4 ring-white ${style.rank}`}>{user.rank}</span>
            <div className="relative mt-3">
                <span aria-hidden="true" className="absolute -inset-3 rounded-full bg-white/70 blur-md" />
                {/* Avatar URLs come from multiple external identity providers. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt={`Ảnh đại diện của ${user.name}`} className={`relative size-20 rounded-full border-4 object-cover shadow-md ${style.avatar}`} src={user.avatar} />
                <Medal aria-hidden="true" className={`absolute -bottom-2 -right-2 size-7 fill-current drop-shadow-sm ${style.medal}`} />
            </div>
            <h2 className="mt-4 w-full truncate text-base font-black text-slate-950">{user.name}</h2>
            <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-slate-500"><Clock3 aria-hidden="true" className="size-3.5" />{user.time}</span>
            <strong className={`mt-auto w-full rounded-xl border px-3 py-2 text-lg font-black tabular-nums ${style.score}`}>{user.score}đ</strong>
        </article>
    )
}

export function Leaderboard({ leaderboard, currentUserRank }: LeaderboardProps) {
    const [activeTab, setActiveTab] = useState<"tuan-nay" | "thang-nay">("tuan-nay")
    const podium = [2, 1, 3].map((rank) => leaderboard.find((user) => user.rank === rank)).filter((user): user is LeaderboardUser => Boolean(user))
    const rest = leaderboard.filter((user) => user.rank > 3)

    return (
        <section className="mx-auto w-full max-w-7xl space-y-5 pb-10">
            <header className="relative overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-r from-white via-blue-50/40 to-violet-50/60 p-5 shadow-[0_12px_36px_rgba(30,64,175,0.08)] sm:flex sm:items-center sm:justify-between sm:gap-5 sm:px-7">
                <div aria-hidden="true" className="absolute -right-12 -top-20 size-48 rounded-full bg-violet-200/30 blur-3xl" />
                <div className="relative flex items-center gap-3">
                    <span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-200"><Trophy aria-hidden="true" className="size-6" /></span>
                    <div><h1 className="text-xl font-black text-slate-950 sm:text-2xl">Bảng xếp hạng</h1><p className="mt-0.5 text-xs text-slate-500 sm:text-sm">Top thí sinh có thành tích tốt nhất trong kỳ thi.</p></div>
                </div>
                <div className="relative mt-4 grid grid-cols-2 rounded-full bg-white/80 p-1 shadow-sm ring-1 ring-slate-200 sm:mt-0">
                    {([['tuan-nay', 'Tuần này'], ['thang-nay', 'Tháng này']] as const).map(([id, label]) => (
                        <button className={`min-h-9 rounded-full px-4 text-xs font-bold transition-[background-color,color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${activeTab === id ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`} key={id} onClick={() => setActiveTab(id)} type="button">{label}</button>
                    ))}
                </div>
            </header>

            {podium.length > 0 ? <div className="grid gap-5 px-1 pt-8 md:grid-cols-3 md:items-end md:px-10">{podium.map((user) => <PodiumCard key={user.rank} user={user} />)}</div> : null}

            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_12px_36px_rgba(15,23,42,0.06)]">
                <div className="hidden grid-cols-[60px_minmax(0,1fr)_minmax(160px,.7fr)_120px_44px] gap-3 border-b border-slate-100 bg-slate-50/80 px-5 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500 md:grid">
                    <span>#</span><span>Thí sinh</span><span>Thời gian</span><span className="text-right">Điểm số</span><span />
                </div>
                <ol className="divide-y divide-slate-100 px-3 sm:px-4">
                    {rest.map((user) => {
                        const progress = Math.max(16, Math.min(100, user.score / 2))
                        return (
                            <li className="grid grid-cols-[36px_42px_minmax(0,1fr)_auto] items-center gap-2.5 py-3 md:grid-cols-[60px_44px_minmax(0,1fr)_minmax(160px,.7fr)_120px_44px] md:gap-3" key={user.rank}>
                                <span className="grid size-8 place-items-center rounded-full bg-slate-50 text-xs font-black text-slate-600 ring-1 ring-slate-200">{user.rank}</span>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img alt={`Ảnh đại diện của ${user.name}`} className="size-10 rounded-full border border-slate-200 bg-blue-50 object-cover" src={user.avatar} />
                                <strong className="min-w-0 truncate text-sm text-slate-900">{user.name}</strong>
                                <div className="col-span-2 col-start-3 flex items-center gap-3 md:col-span-1 md:col-start-auto"><span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-slate-500"><Clock3 aria-hidden="true" className="size-3.5 text-blue-500" />{user.time}</span><div className="hidden h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 sm:block"><span className="block h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-400" style={{ width: `${progress}%` }} /></div></div>
                                <strong className="col-start-4 row-start-1 text-right text-sm font-black tabular-nums text-blue-700 md:col-start-auto md:row-start-auto">{user.score}đ</strong>
                                <span className="hidden size-8 place-items-center rounded-full text-slate-400 ring-1 ring-slate-200 md:grid"><Star aria-hidden="true" className="size-4" /></span>
                            </li>
                        )
                    })}
                    {rest.length === 0 ? <li className="p-8 text-center text-sm text-slate-500">Chưa có dữ liệu thứ hạng tiếp theo.</li> : null}
                </ol>
                {currentUserRank ? <div className="flex items-center gap-3 border-t border-blue-100 bg-blue-50/70 px-5 py-4"><span className="grid size-9 place-items-center rounded-full bg-blue-600 text-xs font-black text-white">{currentUserRank.rank || '-'}</span><div className="min-w-0 flex-1"><strong className="text-sm text-blue-950">Vị trí của bạn</strong><p className="mt-0.5 text-xs text-blue-700">{currentUserRank.score || 0} điểm · {currentUserRank.time || '0 phút'}</p></div><CalendarDays aria-hidden="true" className="size-5 text-blue-500" /></div> : null}
            </div>
        </section>
    )
}
