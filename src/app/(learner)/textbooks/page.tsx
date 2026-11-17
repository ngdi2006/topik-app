"use client"

import { useEffect, useState } from "react"
import { LearnerSidebar } from "@/components/shared/LearnerSidebar"
import { LearnerTopbar } from "@/components/shared/LearnerTopbar"
import TextbookLibrary from "@/components/textbooks/TextbookLibrary"
import type { TextbookSummary } from "@/lib/textbooks/types"

export default function TextbookLibraryPage() {
  const [books, setBooks] = useState<TextbookSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [desktopMenuOpen, setDesktopMenuOpen] = useState(true)

  const [error, setError] = useState<string | null>(null)
  const [reload, setReload] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    void fetch("/api/textbooks", { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error("Unable to load textbooks")
      const data = await response.json()
      if (!controller.signal.aborted) setBooks(data.books ?? [])
    }).catch(() => { if (!controller.signal.aborted) setError("Không tải được thư viện. Vui lòng thử lại.") })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [reload])
  return <div className="flex min-h-screen bg-slate-50">
    <LearnerSidebar desktopOpen={desktopMenuOpen} mobileOpen={mobileMenuOpen} onMobileOpenChange={setMobileMenuOpen} />
    <div className="min-w-0 flex-1">
      <LearnerTopbar onOpenMobileMenu={() => setMobileMenuOpen(true)} onToggleDesktopMenu={() => setDesktopMenuOpen(value => !value)} title="Giáo trình EPS" />
      <TextbookLibrary books={books} loading={loading} error={error} onRetry={() => { setError(null); setLoading(true); setReload(value => value + 1) }} />
    </div>
  </div>
}
