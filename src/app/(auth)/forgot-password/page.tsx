"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, CheckCircle2, Loader2, Mail } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { getVietnameseAuthError } from "@/lib/auth-flow"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function ForgotPasswordPage() {
    const supabase = useMemo(() => createClient(), [])
    const [email, setEmail] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [isSent, setIsSent] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault()
        setErrorMessage(null)
        setIsLoading(true)
        const callback = new URL('/api/auth/callback', window.location.origin)
        callback.searchParams.set('next', '/reset-password')
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: callback.toString() })
        setIsLoading(false)

        if (error) {
            setErrorMessage(getVietnameseAuthError(error.message))
            return
        }
        setIsSent(true)
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
            <Card className="relative w-full max-w-md border-slate-200 shadow-xl">
                <Link aria-label="Quay lại đăng nhập" className="absolute left-4 top-4 rounded-full p-2 text-slate-500 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-600" href="/login"><ArrowLeft aria-hidden="true" className="size-5" /></Link>
                <CardHeader className="items-center pt-8 text-center">
                    <div className={`flex size-12 items-center justify-center rounded-2xl ${isSent ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>{isSent ? <CheckCircle2 aria-hidden="true" className="size-6" /> : <Mail aria-hidden="true" className="size-6" />}</div>
                    <CardTitle className="mt-2 text-2xl font-black">{isSent ? 'Kiểm tra email' : 'Lấy lại mật khẩu'}</CardTitle>
                    <CardDescription>{isSent ? `Liên kết đặt lại mật khẩu đã được gửi tới ${email}.` : 'Nhập email đã đăng ký để nhận liên kết đặt lại mật khẩu.'}</CardDescription>
                </CardHeader>
                <CardContent>
                    {isSent ? (
                        <div className="space-y-3"><p className="rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-600">Nếu chưa thấy email, hãy kiểm tra thư rác hoặc chờ vài phút rồi gửi lại.</p><Button className="w-full" onClick={() => setIsSent(false)} variant="outline">Gửi lại email</Button><Button asChild className="w-full"><Link href="/login">Về đăng nhập</Link></Button></div>
                    ) : (
                        <form className="space-y-4" onSubmit={handleSubmit}>
                            <div className="space-y-1.5"><Label htmlFor="email">Email</Label><Input autoComplete="email" id="email" inputMode="email" name="email" onChange={(event) => setEmail(event.target.value)} placeholder="tenban@example.com…" required spellCheck={false} type="email" value={email} /></div>
                            {errorMessage ? <p aria-live="polite" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700" role="alert">{errorMessage}</p> : null}
                            <Button className="min-h-11 w-full font-bold" disabled={isLoading} type="submit">{isLoading ? <><Loader2 aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />Đang gửi…</> : 'Gửi liên kết đặt lại'}</Button>
                        </form>
                    )}
                </CardContent>
            </Card>
        </main>
    )
}
