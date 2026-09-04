"use client"

import { useCallback, useEffect, useState } from "react"
import { Coins, Menu, ShoppingCart } from "lucide-react"
import { PaymentModal } from "@/components/payment/PaymentModal"
import { UserNav } from "@/components/shared/UserNav"

type LearnerTopbarProps = {
  title: string
  onOpenMobileMenu: () => void
  onToggleDesktopMenu: () => void
}

export function LearnerTopbar({ title, onOpenMobileMenu, onToggleDesktopMenu }: LearnerTopbarProps) {
  const [credits, setCredits] = useState(0)
  const [paymentOpen, setPaymentOpen] = useState(false)

  const loadCredits = useCallback(() => {
    void fetch("/api/payment/credits")
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => setCredits(data.remaining_credits ?? 0))
      .catch(() => undefined)
  }, [])

  useEffect(() => loadCredits(), [loadCredits])

  return <>
    <header className="sticky top-0 z-40 flex h-[72px] items-center justify-between border-b bg-white px-4 md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button aria-label="Mở menu" className="grid size-11 place-items-center rounded-xl text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 md:hidden" onClick={onOpenMobileMenu} type="button"><Menu className="size-8" /></button>
        <button aria-label="Thu gọn hoặc mở rộng menu" className="hidden size-11 place-items-center rounded-xl text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 md:grid" onClick={onToggleDesktopMenu} type="button"><Menu className="size-8" /></button>
        <h1 className="truncate text-lg font-black text-slate-900 sm:text-xl">{title}</h1>
      </div>
      <div className="ml-3 flex shrink-0 items-center gap-2 md:gap-3">
        <div className="flex h-9 items-center gap-1.5 rounded-xl border border-blue-100 bg-blue-50 px-2.5 text-xs font-semibold text-blue-700 sm:px-3 sm:text-sm"><Coins className="size-4" /><span>{credits} lượt</span></div>
        <button className="hidden h-9 items-center gap-2 rounded-lg border border-blue-200 bg-white px-3 text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-blue-50 sm:flex" onClick={() => setPaymentOpen(true)} type="button"><ShoppingCart className="size-4" />Mua thêm</button>
        <UserNav />
      </div>
    </header>
    <PaymentModal onClose={() => setPaymentOpen(false)} onSuccess={loadCredits} open={paymentOpen} />
  </>
}
