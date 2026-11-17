"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

export type HomeAccountInfo = { name: string; avatarUrl: string | null }

export default function HomeAccount({ account }: { account: HomeAccountInfo | null }) {
  const [failedAvatar, setFailedAvatar] = useState<string | null>(null)
  if (!account) return <Link href="/login" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-violet-600 px-4 text-xs font-semibold text-white transition-colors hover:from-blue-700 hover:to-violet-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 sm:px-5 sm:text-sm" data-home-login>Đăng nhập<ArrowUpRight className="size-3.5" /></Link>
  const initials = account.name.trim().split(/\s+/u).slice(-2).map(part => Array.from(part)[0]).join("").toLocaleUpperCase("vi-VN") || "U"
  return <Link href="/dashboard" aria-label={`Mở tài khoản ${account.name}`} title={account.name} data-home-avatar className="relative grid size-11 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-white bg-gradient-to-br from-blue-500 to-violet-600 text-sm font-bold text-white shadow-sm ring-1 ring-blue-200 transition-shadow hover:ring-blue-400 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">
    {account.avatarUrl && account.avatarUrl !== failedAvatar ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={account.avatarUrl} alt="" className="size-full object-cover" referrerPolicy="no-referrer" onError={() => setFailedAvatar(account.avatarUrl)} />
    ) : <span aria-hidden="true">{initials}</span>}
  </Link>
}
