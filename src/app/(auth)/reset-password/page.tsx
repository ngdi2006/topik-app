"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { CheckCircle2, Eye, EyeOff, Loader2, LockKeyhole } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { getVietnameseAuthError } from "@/lib/auth-flow"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function ResetPasswordPage() {
    const supabase = useMemo(() => createClient(), [])
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [isChecking, setIsChecking] = useState(true)
    const [isLoading, setIsLoading] = useState(false)
    const [hasSession, setHasSession] = useState(false)
    const [isComplete, setIsComplete] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    useEffect(() => {
        void supabase.auth.getSession().then(({ data }) => {
            setHasSession(Boolean(data.session))
            setIsChecking(false)
        })
    }, [supabase])

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault()
        setErrorMessage(null)
        if (password !== confirmPassword) {
            setErrorMessage('Mật khẩu xác nhận chưa khớp.')
            return
        }
        setIsLoading(true)
        const { error } = await supabase.auth.updateUser({ password })
        setIsLoading(false)
        if (error) {
            setErrorMessage(getVietnameseAuthError(error.message))
            return
        }
        await supabase.auth.signOut()
        setIsComplete(true)
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
            <Card className="w-full max-w-md border-slate-200 shadow-xl">
                <CardHeader className="items-center text-center"><div className={`flex size-12 items-center justify-center rounded-2xl ${isComplete ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>{isComplete ? <CheckCircle2 aria-hidden="true" className="size-6" /> : <LockKeyhole aria-hidden="true" className="size-6" />}</div><CardTitle className="mt-2 text-2xl font-black">{isComplete ? 'Đã đổi mật khẩu' : 'Tạo mật khẩu mới'}</CardTitle><CardDescription>{isComplete ? 'Bạn có thể đăng nhập bằng mật khẩu mới.' : 'Sử dụng mật khẩu mới có ít nhất 6 ký tự.'}</CardDescription></CardHeader>
                <CardContent>
                    {isChecking ? <div className="flex justify-center py-8"><Loader2 aria-label="Đang kiểm tra liên kết" className="size-6 animate-spin text-blue-600 motion-reduce:animate-none" /></div> : isComplete ? <Button asChild className="w-full"><Link href="/login?reset=success">Đăng nhập ngay</Link></Button> : !hasSession ? <div className="space-y-3 text-center"><p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.</p><Button asChild className="w-full"><Link href="/forgot-password">Yêu cầu liên kết mới</Link></Button></div> : (
                        <form className="space-y-4" onSubmit={handleSubmit}>
                            <div className="space-y-1.5"><Label htmlFor="password">Mật khẩu mới</Label><div className="relative"><Input autoComplete="new-password" className="pr-11" id="password" minLength={6} name="password" onChange={(event) => setPassword(event.target.value)} required type={showPassword ? 'text' : 'password'} value={password} /><button aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} className="absolute right-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-600" onClick={() => setShowPassword((visible) => !visible)} type="button">{showPassword ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}</button></div></div>
                            <div className="space-y-1.5"><Label htmlFor="confirm-password">Xác nhận mật khẩu</Label><Input autoComplete="new-password" id="confirm-password" minLength={6} name="confirm-password" onChange={(event) => setConfirmPassword(event.target.value)} required type={showPassword ? 'text' : 'password'} value={confirmPassword} /></div>
                            {errorMessage ? <p aria-live="polite" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700" role="alert">{errorMessage}</p> : null}
                            <Button className="min-h-11 w-full font-bold" disabled={isLoading} type="submit">{isLoading ? <><Loader2 aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />Đang cập nhật…</> : 'Cập nhật mật khẩu'}</Button>
                        </form>
                    )}
                </CardContent>
            </Card>
        </main>
    )
}
