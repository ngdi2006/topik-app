"use client"

import { useEffect } from "react"
import { RefreshCw } from "lucide-react"

const RECOVERY_KEY = "learner-client-error-recovery"
const RECOVERY_WINDOW_MS = 30_000

export default function LearnerError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Learner application error", error)

    try {
      const lastRecovery = Number(window.sessionStorage.getItem(RECOVERY_KEY) || 0)
      if (!lastRecovery || Date.now() - lastRecovery > RECOVERY_WINDOW_MS) {
        window.sessionStorage.setItem(RECOVERY_KEY, String(Date.now()))
        window.location.reload()
      }
    } catch {
      // Safari can restrict sessionStorage. Keep the manual recovery button usable.
    }
  }, [error])

  const retry = () => {
    try {
      window.sessionStorage.removeItem(RECOVERY_KEY)
    } catch {
      // Ignore restricted storage and retry the route boundary directly.
    }
    reset()
  }

  return <main className="grid min-h-dvh place-items-center bg-slate-50 px-5 text-center">
    <div className="w-full max-w-sm rounded-3xl border border-blue-100 bg-white p-7 shadow-xl shadow-blue-950/10">
      <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-blue-50 text-blue-600"><RefreshCw className="size-7" /></div>
      <h1 className="mt-5 text-xl font-black text-slate-950">Không thể tải giao diện</h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">Kết nối hoặc dữ liệu tạm của Safari bị gián đoạn. Hệ thống đã thử tải lại an toàn.</p>
      <button className="mt-6 h-11 w-full rounded-xl bg-blue-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700" onClick={retry} type="button">Tải lại trang</button>
    </div>
  </main>
}
