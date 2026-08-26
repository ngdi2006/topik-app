"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { CheckCircle2, Loader2, Mail, Sparkles } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { getVietnameseAuthError, sanitizeNextPath } from "@/lib/auth-flow"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"

function CheckEmailContent() {
    const searchParams = useSearchParams()
    const supabase = useMemo(() => createClient(), [])
    const [isSending, setIsSending] = useState(false)
    const [cooldown, setCooldown] = useState(0)
    const email = searchParams.get('email') || ''
    const nextPath = sanitizeNextPath(searchParams.get('next'))

    useEffect(() => {
        if (cooldown <= 0) return
        const timer = window.setInterval(() => setCooldown((seconds) => Math.max(0, seconds - 1)), 1000)
        return () => window.clearInterval(timer)
    }, [cooldown])

    const resendEmail = async () => {
        if (!email || cooldown > 0) return
        setIsSending(true)
        const callback = new URL('/api/auth/callback', window.location.origin)
        callback.searchParams.set('next', nextPath)
        const { error } = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: callback.toString() } })
        setIsSending(false)
        if (error) toast.error(getVietnameseAuthError(error.message))
        else {
            setCooldown(60)
            toast.success('Đã tiếp nhận yêu cầu. Nếu email chưa xác nhận, thư mới sẽ được gửi.')
        }
    }

    const signInWithGoogle = async () => {
        const callback = new URL('/api/auth/callback', window.location.origin)
        callback.searchParams.set('next', nextPath)
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: callback.toString() },
        })
        if (error) toast.error(getVietnameseAuthError(error.message))
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
            <Card className="w-full max-w-md border-slate-200 text-center shadow-xl">
                <CardHeader className="items-center pt-8"><div className="relative flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700"><Mail aria-hidden="true" className="size-7" /><CheckCircle2 aria-hidden="true" className="absolute -bottom-1 -right-1 size-5 rounded-full bg-white text-emerald-600" /></div><CardTitle className="mt-3 text-2xl font-black">Kiểm tra email</CardTitle><CardDescription>Nếu <strong className="text-slate-800">{email || 'email của bạn'}</strong> hợp lệ và chưa được xác nhận, hệ thống sẽ gửi một liên kết xác nhận.</CardDescription></CardHeader>
                <CardContent className="space-y-3">
                    <div className="rounded-xl bg-slate-50 p-3 text-left text-sm leading-6 text-slate-600">
                        <p>Kiểm tra Hộp thư đến, Spam/Thư rác và tab Quảng cáo. Email có thể đến chậm vài phút.</p>
                        <p className="mt-1 font-medium text-slate-700">Nếu tài khoản đã tồn tại hoặc đã xác nhận, hãy đăng nhập hay lấy lại mật khẩu.</p>
                    </div>
                    <Button className="w-full" disabled={!email || isSending || cooldown > 0} onClick={resendEmail} variant="outline">
                        {isSending ? <><Loader2 aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />Đang gửi…</> : cooldown > 0 ? `Có thể gửi lại sau ${cooldown}s` : 'Gửi lại email xác nhận'}
                    </Button>
                    <Button className="w-full" onClick={signInWithGoogle} variant="outline"><Sparkles aria-hidden="true" className="size-4 text-blue-600" />Tiếp tục với Google</Button>
                    <Button asChild className="w-full"><Link href={`/login?next=${encodeURIComponent(nextPath)}`}>Đăng nhập bằng email</Link></Button>
                    <Button asChild className="w-full" variant="ghost"><Link href="/forgot-password">Quên mật khẩu?</Link></Button>
                </CardContent>
            </Card>
        </main>
    )
}

export default function CheckEmailPage() {
    return <Suspense fallback={<main className="min-h-screen bg-slate-50" />}><CheckEmailContent /></Suspense>
}
