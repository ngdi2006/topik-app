"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ArrowLeft, Eye, EyeOff, Loader2, Sparkles } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { getVietnameseAuthError, sanitizeNextPath } from "@/lib/auth-flow"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"

function LoginForm() {
    const searchParams = useSearchParams()
    const supabase = useMemo(() => createClient(), [])
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const nextPath = sanitizeNextPath(searchParams.get('next'))
    const callbackError = searchParams.get('error_description') || searchParams.get('error')
    const displayedError = errorMessage || (callbackError ? getVietnameseAuthError(callbackError) : null)

    useEffect(() => {
        if (searchParams.get('reset') === 'success') toast.success('Mật khẩu đã được cập nhật. Vui lòng đăng nhập lại.')
    }, [searchParams])

    const handleLogin = async (event: React.FormEvent) => {
        event.preventDefault()
        setErrorMessage(null)
        setIsLoading(true)

        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })

        if (error) {
            setErrorMessage(getVietnameseAuthError(error.message))
            setIsLoading(false)
            return
        }

        try {
            const response = await fetch(`/api/auth/destination?next=${encodeURIComponent(nextPath)}`, {
                cache: 'no-store',
            })
            const result = response.ok ? await response.json() : null
            window.location.assign(result?.destination || nextPath)
        } catch {
            window.location.assign(nextPath)
        }
    }

    const handleGoogleLogin = async () => {
        const userAgent = navigator.userAgent || navigator.vendor
        if (/FBAN|FBAV|Zalo|Instagram|Line|TikTok/i.test(userAgent)) {
            toast.error("Hãy mở trang bằng Chrome hoặc Safari để đăng nhập Google.", {
                description: "Mở menu của ứng dụng hiện tại và chọn “Mở bằng trình duyệt” hoặc “Mở trong Safari”.",
                duration: 8000,
            })
            return
        }

        setErrorMessage(null)
        setIsLoading(true)
        const callback = new URL('/api/auth/callback', window.location.origin)
        callback.searchParams.set('next', nextPath)
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: callback.toString() },
        })

        if (error) {
            setErrorMessage(getVietnameseAuthError(error.message))
            setIsLoading(false)
        }
    }

    return (
        <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 p-4">
            <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(#dbeafe_1px,transparent_1px)] [background-size:18px_18px] opacity-60" />
            <div aria-hidden="true" className="absolute -left-32 top-0 size-96 rounded-full bg-blue-200/50 blur-3xl" />
            <div aria-hidden="true" className="absolute -right-32 bottom-0 size-96 rounded-full bg-violet-200/40 blur-3xl" />

            <Card className="relative w-full max-w-md overflow-hidden border-slate-200/80 bg-white/95 shadow-2xl shadow-slate-900/10 backdrop-blur">
                <CardHeader className="space-y-3 pb-5 text-center">
                    <Link aria-label="Về trang chủ" className="absolute left-4 top-4 rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-blue-600" href="/">
                        <ArrowLeft aria-hidden="true" className="size-5" />
                    </Link>
                    <div className="relative mx-auto h-14 w-28 overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-slate-200">
                        <Image alt="Korea Link" className="object-contain p-1" fill priority sizes="112px" src="/logomobile.png" />
                    </div>
                    <div>
                        <CardTitle className="text-2xl font-black tracking-tight">Chào mừng trở lại</CardTitle>
                        <CardDescription className="mt-1">Đăng nhập để tiếp tục lộ trình EPS‑TOPIK.</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button className="min-h-11 w-full" disabled={isLoading} onClick={handleGoogleLogin} variant="outline">
                        <Sparkles aria-hidden="true" className="size-4 text-blue-600" />
                        Tiếp tục với Google
                    </Button>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center"><Separator /></div>
                        <div className="relative flex justify-center text-xs"><span className="bg-white px-2 text-slate-500">Hoặc đăng nhập bằng email</span></div>
                    </div>

                    <form className="space-y-4" onSubmit={handleLogin}>
                        <div className="space-y-1.5">
                            <Label htmlFor="email">Email</Label>
                            <Input autoComplete="email" id="email" inputMode="email" name="email" onChange={(event) => setEmail(event.target.value)} placeholder="tenban@example.com…" required spellCheck={false} type="email" value={email} />
                        </div>
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-3">
                                <Label htmlFor="password">Mật khẩu</Label>
                                <Link className="text-xs font-bold text-blue-700 hover:text-blue-900 hover:underline" href="/forgot-password">Quên mật khẩu?</Link>
                            </div>
                            <div className="relative">
                                <Input autoComplete="current-password" className="pr-11" id="password" name="password" onChange={(event) => setPassword(event.target.value)} required type={showPassword ? 'text' : 'password'} value={password} />
                                <button aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} className="absolute right-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-blue-600" onClick={() => setShowPassword((visible) => !visible)} type="button">
                                    {showPassword ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
                                </button>
                            </div>
                        </div>

                        {displayedError ? <p aria-live="polite" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-700" role="alert">{displayedError}</p> : null}

                        <Button className="min-h-11 w-full font-bold" disabled={isLoading} type="submit">
                            {isLoading ? <><Loader2 aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" /> Đang đăng nhập…</> : 'Đăng nhập'}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="justify-center border-t border-slate-100 py-4 text-sm text-slate-600">
                    Chưa có tài khoản?&nbsp;<Link className="font-bold text-blue-700 hover:underline" href={`/register?next=${encodeURIComponent(nextPath)}`}>Đăng ký miễn phí</Link>
                </CardFooter>
            </Card>
        </main>
    )
}

export default function LoginPage() {
    return <Suspense fallback={<main className="min-h-screen bg-slate-50" />}><LoginForm /></Suspense>
}
