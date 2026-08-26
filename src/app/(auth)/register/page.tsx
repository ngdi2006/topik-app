"use client"

import { Suspense, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ArrowLeft, Eye, EyeOff, Loader2, Sparkles, UserPlus } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { getVietnameseAuthError, sanitizeNextPath } from "@/lib/auth-flow"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"

function RegisterForm() {
    const searchParams = useSearchParams()
    const supabase = useMemo(() => createClient(), [])
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [isExistingAccount, setIsExistingAccount] = useState(false)
    const nextPath = sanitizeNextPath(searchParams.get('next'))

    const handleRegister = async (event: React.FormEvent) => {
        event.preventDefault()
        setErrorMessage(null)
        setIsExistingAccount(false)

        if (password !== confirmPassword) {
            setErrorMessage('Mật khẩu xác nhận chưa khớp.')
            return
        }

        setIsLoading(true)
        const callback = new URL('/api/auth/callback', window.location.origin)
        callback.searchParams.set('next', nextPath)
        const { data, error } = await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
                data: { full_name: name.trim() },
                emailRedirectTo: callback.toString(),
            },
        })

        if (error) {
            setErrorMessage(getVietnameseAuthError(error.message))
            setIsLoading(false)
            return
        }

        if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
            setIsExistingAccount(true)
            setErrorMessage('Email này có thể đã được đăng ký. Hãy đăng nhập hoặc lấy lại mật khẩu thay vì chờ email xác nhận.')
            setIsLoading(false)
            return
        }

        if (data.session) {
            window.location.assign(nextPath)
            return
        }

        window.location.assign(`/check-email?email=${encodeURIComponent(email.trim())}&next=${encodeURIComponent(nextPath)}`)
    }

    const handleGoogleLogin = async () => {
        const userAgent = navigator.userAgent || navigator.vendor
        if (/FBAN|FBAV|Zalo|Instagram|Line|TikTok/i.test(userAgent)) {
            toast.error("Hãy mở trang bằng Chrome hoặc Safari để đăng ký Google.", {
                description: "Mở menu của ứng dụng hiện tại và chọn “Mở bằng trình duyệt” hoặc “Mở trong Safari”.",
                duration: 8000,
            })
            return
        }

        setErrorMessage(null)
        setIsLoading(true)
        const callback = new URL('/api/auth/callback', window.location.origin)
        callback.searchParams.set('next', nextPath)
        const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: callback.toString() } })
        if (error) {
            setErrorMessage(getVietnameseAuthError(error.message))
            setIsLoading(false)
        }
    }

    return (
        <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 p-4 py-8">
            <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(#dbeafe_1px,transparent_1px)] [background-size:18px_18px] opacity-60" />
            <div aria-hidden="true" className="absolute -left-32 top-0 size-96 rounded-full bg-blue-200/50 blur-3xl" />
            <div aria-hidden="true" className="absolute -right-32 bottom-0 size-96 rounded-full bg-violet-200/40 blur-3xl" />

            <Card className="relative w-full max-w-md overflow-hidden border-slate-200/80 bg-white/95 shadow-2xl shadow-slate-900/10 backdrop-blur">
                <CardHeader className="space-y-3 pb-5 text-center">
                    <Link aria-label="Về trang chủ" className="absolute left-4 top-4 rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-blue-600" href="/"><ArrowLeft aria-hidden="true" className="size-5" /></Link>
                    <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-200"><UserPlus aria-hidden="true" className="size-6" /></div>
                    <div>
                        <CardTitle className="text-2xl font-black tracking-tight">Tạo tài khoản miễn phí</CardTitle>
                        <CardDescription className="mt-1">Bắt đầu luyện thi EPS‑TOPIK chỉ trong ít phút.</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button className="min-h-11 w-full" disabled={isLoading} onClick={handleGoogleLogin} variant="outline"><Sparkles aria-hidden="true" className="size-4 text-blue-600" />Đăng ký với Google</Button>
                    <div className="relative"><div className="absolute inset-0 flex items-center"><Separator /></div><div className="relative flex justify-center text-xs"><span className="bg-white px-2 text-slate-500">Hoặc đăng ký bằng email</span></div></div>

                    <form className="space-y-3.5" onSubmit={handleRegister}>
                        <div className="space-y-1.5"><Label htmlFor="name">Họ và tên</Label><Input autoComplete="name" id="name" name="name" onChange={(event) => setName(event.target.value)} placeholder="Nguyễn Văn A…" required value={name} /></div>
                        <div className="space-y-1.5"><Label htmlFor="email">Email</Label><Input autoComplete="email" id="email" inputMode="email" name="email" onChange={(event) => setEmail(event.target.value)} placeholder="tenban@example.com…" required spellCheck={false} type="email" value={email} /></div>
                        <div className="space-y-1.5">
                            <Label htmlFor="password">Mật khẩu</Label>
                            <div className="relative">
                                <Input autoComplete="new-password" className="pr-11" id="password" minLength={6} name="password" onChange={(event) => setPassword(event.target.value)} required type={showPassword ? 'text' : 'password'} value={password} />
                                <button aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} className="absolute right-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-600" onClick={() => setShowPassword((visible) => !visible)} type="button">{showPassword ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}</button>
                            </div>
                            <p className="text-xs text-slate-500">Ít nhất 6 ký tự.</p>
                        </div>
                        <div className="space-y-1.5"><Label htmlFor="confirm-password">Xác nhận mật khẩu</Label><Input autoComplete="new-password" id="confirm-password" minLength={6} name="confirm-password" onChange={(event) => setConfirmPassword(event.target.value)} required type={showPassword ? 'text' : 'password'} value={confirmPassword} /></div>

                        {errorMessage ? <p aria-live="polite" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-700" role="alert">{errorMessage}</p> : null}
                        {isExistingAccount ? (
                            <div className="grid grid-cols-2 gap-2">
                                <Button asChild variant="outline"><Link href={`/login?next=${encodeURIComponent(nextPath)}`}>Đăng nhập</Link></Button>
                                <Button asChild variant="outline"><Link href="/forgot-password">Quên mật khẩu</Link></Button>
                            </div>
                        ) : null}
                        <Button className="min-h-11 w-full font-bold" disabled={isLoading} type="submit">{isLoading ? <><Loader2 aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />Đang tạo tài khoản…</> : 'Tạo tài khoản'}</Button>
                    </form>
                </CardContent>
                <CardFooter className="justify-center border-t border-slate-100 py-4 text-sm text-slate-600">Đã có tài khoản?&nbsp;<Link className="font-bold text-blue-700 hover:underline" href={`/login?next=${encodeURIComponent(nextPath)}`}>Đăng nhập</Link></CardFooter>
            </Card>
        </main>
    )
}

export default function RegisterPage() {
    return <Suspense fallback={<main className="min-h-screen bg-slate-50" />}><RegisterForm /></Suspense>
}
