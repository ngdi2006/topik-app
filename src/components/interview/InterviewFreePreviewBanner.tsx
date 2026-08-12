"use client"

import { useEffect, useState } from "react"
import { ArrowRight, Check, Gift, LockKeyhole, Sparkles } from "lucide-react"
import type { InterviewAccessSnapshot } from "@/features/interview-access/model"
import { InterviewSubscriptionDialog } from "@/components/interview/InterviewSubscriptionDialog"

type PreviewKind = "command" | "vocabulary" | "sign"

const PREVIEW_COPY: Record<PreviewKind, { label: string; detail: string }> = {
  command: {
    label: "5 câu khẩu lệnh miễn phí",
    detail: "Bạn đang học bản trải nghiệm của P2.",
  },
  vocabulary: {
    label: "5 từ vựng + 5 biển báo miễn phí",
    detail: "Bạn đang học bản trải nghiệm của P3.",
  },
  sign: {
    label: "5 biển báo miễn phí",
    detail: "Đây là nội dung mẫu để bạn trải nghiệm cách học.",
  },
}

let accessRequest: Promise<InterviewAccessSnapshot> | null = null

function loadAccess() {
  if (!accessRequest) {
    accessRequest = fetch("/api/interview/access", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) throw new Error("Không thể kiểm tra quyền truy cập")
      return response.json() as Promise<InterviewAccessSnapshot>
    })
  }
  return accessRequest
}

export function InterviewFreePreviewBanner({ kind, compact = false }: { kind: PreviewKind; compact?: boolean }) {
  const [access, setAccess] = useState<InterviewAccessSnapshot | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    let active = true
    void loadAccess()
      .then((result) => {
        if (active) setAccess(result)
      })
      .catch(() => {
        // The lesson remains usable if the access-status request is temporarily unavailable.
      })
    return () => {
      active = false
    }
  }, [])

  if (!access || access.hasFullAccess) return null

  const copy = PREVIEW_COPY[kind]

  return (
    <>
      <aside className={`relative overflow-hidden rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 via-white to-blue-50 shadow-sm ${compact ? "p-3" : "p-3.5 sm:p-4"}`}>
        <Sparkles className="pointer-events-none absolute -right-2 -top-3 size-16 text-violet-200/50" />
        <div className={`relative flex ${compact ? "items-center" : "items-start"} gap-3`}>
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white shadow-md shadow-violet-200">
            <Gift className="size-4.5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <strong className="text-sm font-black text-slate-900">Đang dùng bản miễn phí</strong>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-emerald-700">{copy.label}</span>
            </div>
            {!compact && <p className="mt-1 text-xs leading-5 text-slate-600">{copy.detail}</p>}
            <div className="mt-1.5 flex items-start gap-1.5 text-xs font-semibold leading-5 text-violet-800">
              <Check className="mt-0.5 size-3.5 shrink-0" />
              <span>Mua một gói để mở toàn bộ P2–P8, thi thử và ôn tập.</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="hidden shrink-0 items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-xs font-black text-white shadow-sm transition hover:bg-violet-700 sm:inline-flex"
          >
            <LockKeyhole className="size-3.5" /> Mở khóa <ArrowRight className="size-3.5" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="relative mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2.5 text-xs font-black text-white shadow-sm transition active:scale-[0.99] sm:hidden"
        >
          <LockKeyhole className="size-3.5" /> Mở khóa toàn bộ <ArrowRight className="size-3.5" />
        </button>
      </aside>
      <InterviewSubscriptionDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  )
}
