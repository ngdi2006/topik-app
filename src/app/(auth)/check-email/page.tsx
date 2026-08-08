"use client"

import { Suspense, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { CheckCircle2, Loader2, Mail } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { getVietnameseAuthError, sanitizeNextPath } from "@/lib/auth-flow"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"

function CheckEmailContent() {
    const searchParams = useSearchParams()
    const supabase = useMemo(() => createClient(), [])
    const [isSending, setIsSending] = useState(false)
    const email = searchParams.get('email') || ''
    const nextPath = sanitizeNextPath(searchParams.get('next'))

    const resendEmail = async () => {
        if (!email) return
        setIsSending(true)
        const callback = new URL('/api/auth/callback', window.location.origin)
        callback.searchParams.set('next', nextPath)
        const { error } = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: callback.toString() } })
        setIsSending(false)
        if (error) toast.error(getVietnameseAuthError(error.message))
        else toast.success('Đã gửi lại email xác nhận.')
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
            <Card className="w-full max-w-md border-slate-200 text-center shadow-xl">
                <CardHeader className="items-center pt-8"><div className="relative flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700"><Mail aria-hidden="true" className="size-7" /><CheckCircle2 aria-hidden="true" className="absolute -bottom-1 -right-1 size-5 rounded-full bg-white text-emerald-600" /></div><CardTitle className="mt-3 text-2xl font-black">Xác nhận email</CardTitle><CardDescription>Chúng tôi đã gửi liên kết xác nhận tới <strong className="text-slate-800">{email || 'email của bạn'}</strong>.</CardDescription></CardHeader>
                <CardContent className="space-y-3"><p className="rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-600">Mở email và nhấn vào liên kết xác nhận. Sau đó bạn sẽ được đưa thẳng vào nội dung đang chờ.</p><Button className="w-full" disabled={!email || isSending} onClick={resendEmail} variant="outline">{isSending ? <><Loader2 aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />Đang gửi…</> : 'Gửi lại email xác nhận'}</Button><Button asChild className="w-full"><Link href={`/login?next=${encodeURIComponent(nextPath)}`}>Tôi đã xác nhận · Đăng nhập</Link></Button></CardContent>
            </Card>
        </main>
    )
}

export default function CheckEmailPage() {
    return <Suspense fallback={<main className="min-h-screen bg-slate-50" />}><CheckEmailContent /></Suspense>
}
