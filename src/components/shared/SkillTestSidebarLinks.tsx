"use client"

import { Suspense } from "react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { BookOpen, ChevronRight, Ruler, Target, Trophy, Zap } from "lucide-react"

const items = [
    { tab: "mechanical", label: "Thước kẹp", icon: Ruler },
    { tab: "workshop", label: "Đo mẫu", icon: Target },
    { tab: "drill", label: "Luyện đọc", icon: Zap },
    { tab: "exam", label: "Thi thử", icon: Trophy },
    { tab: "anatomy", label: "Cấu tạo", icon: BookOpen },
] as const

type Props = { mobile?: boolean; onNavigate?: () => void }

function Links({ mobile = false, onNavigate, activeTab, tool = "mechanical" }: Props & { activeTab?: string; tool?: string }) {
    return <div className="ml-3 space-y-1 py-1" aria-label="Bài luyện tay nghề">
        {items.map(({ tab, label, icon: Icon }) => {
            const active = activeTab === tab || (tab === "mechanical" && activeTab === "digital")
            const nextTool = tab === "mechanical" ? "mechanical" : tool
            return <Link
                key={tab}
                href={`/skill-test?tab=${tab}&tool=${nextTool}`}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={`relative flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset ${mobile
                    ? active ? "bg-blue-50 text-blue-800 focus-visible:ring-blue-500" : "text-slate-600 hover:bg-slate-50 hover:text-blue-700 focus-visible:ring-blue-500"
                    : active ? "bg-white/15 text-white focus-visible:ring-white/70" : "text-blue-100 hover:bg-white/10 hover:text-white focus-visible:ring-white/70"}`}
            >
                {active && <span aria-hidden="true" className={`absolute left-0 h-4 w-0.5 rounded-full ${mobile ? "bg-blue-600" : "bg-white"}`} />}
                <span className={`grid size-6 shrink-0 place-items-center rounded-md ${active ? mobile ? "bg-blue-100" : "bg-white/15" : ""}`}><Icon aria-hidden="true" className="size-4" strokeWidth={1.75} /></span>
                <span className={`min-w-0 flex-1 ${active ? "font-semibold" : ""}`}>{label}</span>
                {active && <ChevronRight aria-hidden="true" className="size-3.5 shrink-0 opacity-75" />}
            </Link>
        })}
    </div>
}

function ConnectedLinks(props: Props) {
    const pathname = usePathname()
    const search = useSearchParams()
    const tab = search?.get("tab") || "mechanical"
    const tool = search?.get("tool") === "digital" || tab === "digital" ? "digital" : "mechanical"
    return <Links {...props} activeTab={pathname.startsWith("/skill-test") ? tab : undefined} tool={tool} />
}

export function SkillTestSidebarLinks(props: Props) {
    return <Suspense fallback={<Links {...props} />}><ConnectedLinks {...props} /></Suspense>
}
