"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BookOpen, GraduationCap } from "lucide-react"
import { useUserStore } from "@/store/userStore"

export function TextbookNavigationLink({ mobile = false, onNavigate }: { mobile?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname()
  const active = pathname === "/textbooks" || pathname.startsWith("/textbooks/")
  return <Link aria-current={active ? "page" : undefined} className={`flex min-h-11 w-full items-center gap-3 rounded-xl border px-3 py-2 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300 ${mobile ? "border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100" : active ? "border-white bg-white text-blue-700 shadow-sm" : "border-white/20 bg-white/15 text-white hover:bg-white/25"}`} href="/textbooks" onClick={onNavigate}><BookOpen aria-hidden="true" className="size-4 shrink-0" /><span className="min-w-0 flex-1">Giáo trình EPS</span></Link>
}

export function CampusNavigationLink({ mobile = false, onNavigate }: { mobile?: boolean; onNavigate?: () => void }) {
  const role = useUserStore(state => state.role)
  if (role !== "admin") return null
  return <Link href="/campus" onClick={onNavigate} className={`flex min-h-10 w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium ${mobile ? "text-slate-700 hover:bg-slate-50" : "text-white hover:bg-white/15"}`}><GraduationCap aria-hidden="true" className="size-4 shrink-0" /><span className="min-w-0 flex-1">Trung tâm 3D</span><span className="text-[9px] opacity-70">Admin</span></Link>
}
