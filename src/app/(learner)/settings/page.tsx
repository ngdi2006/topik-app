"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useUserStore } from "@/store/userStore"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Loader2, ChevronLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import { UserNav } from "@/components/shared/UserNav"

export default function SettingsPage() {
    const router = useRouter()
    const { user, setUser } = useUserStore()
    const supabase = createClient()
    
    // Profile State
    const [fullName, setFullName] = useState("")
    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)
    
    // Password State
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)

    useEffect(() => {
        if (user) {
            setFullName(user.user_metadata?.full_name || "")
        }
    }, [user])

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsUpdatingProfile(true)
        try {
            const { data, error } = await supabase.auth.updateUser({
                data: { full_name: fullName }
            })

            if (error) throw error

            if (data.user) {
                setUser(data.user)
                toast.success("Cập nhật thông tin thành công")
            }
        } catch (error: any) {
            toast.error(error.message || "Có lỗi xảy ra khi cập nhật thông tin")
        } finally {
            setIsUpdatingProfile(false)
        }
    }

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault()
        if (newPassword !== confirmPassword) {
            toast.error("Mật khẩu xác nhận không khớp")
            return
        }
        if (newPassword.length < 6) {
            toast.error("Mật khẩu phải có ít nhất 6 ký tự")
            return
        }

        setIsUpdatingPassword(true)
        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            })

            if (error) throw error

            toast.success("Cập nhật mật khẩu thành công")
            setNewPassword("")
            setConfirmPassword("")
        } catch (error: any) {
            toast.error(error.message || "Có lỗi xảy ra khi cập nhật mật khẩu")
        } finally {
            setIsUpdatingPassword(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <header className="border-b bg-white px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')}>
                        <ChevronLeft className="w-5 h-5 text-gray-600" />
                    </Button>
                    <div className="font-bold text-xl text-primary">Cài đặt tài khoản</div>
                </div>
                <UserNav />
            </header>

            <main className="flex-1 p-6 md:p-10 max-w-4xl mx-auto w-full">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Cài đặt</h1>
                    <p className="text-sm text-muted-foreground mt-1">Quản lý thông tin cá nhân và bảo mật tài khoản của bạn.</p>
                </div>

                <Tabs defaultValue="profile" className="w-full">
                    <TabsList className="mb-6 grid w-full max-w-[400px] grid-cols-2">
                        <TabsTrigger value="profile">Thông tin</TabsTrigger>
                        <TabsTrigger value="security">Mật khẩu</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="profile">
                        <Card className="border-gray-200 shadow-sm">
                            <CardHeader>
                                <CardTitle>Thông tin người dùng</CardTitle>
                                <CardDescription>
                                    Cập nhật thông tin cá nhân của bạn.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleUpdateProfile} className="space-y-4">
                                    <div className="space-y-2 max-w-md">
                                        <Label htmlFor="email">Email</Label>
                                        <Input id="email" type="email" value={user?.email || ""} disabled className="bg-gray-50 text-gray-500" />
                                    </div>
                                    <div className="space-y-2 max-w-md">
                                        <Label htmlFor="name">Họ và tên</Label>
                                        <Input 
                                            id="name" 
                                            placeholder="Nhập họ và tên" 
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <Button type="submit" disabled={isUpdatingProfile} className="mt-4 bg-[#2B64CE] hover:bg-blue-700">
                                        {isUpdatingProfile ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                        Lưu thay đổi
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    
                    <TabsContent value="security">
                        <Card className="border-gray-200 shadow-sm">
                            <CardHeader>
                                <CardTitle>Đổi mật khẩu</CardTitle>
                                <CardDescription>
                                    Cập nhật mật khẩu mới để bảo mật tài khoản.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleUpdatePassword} className="space-y-4">
                                    <div className="space-y-2 max-w-md">
                                        <Label htmlFor="new">Mật khẩu mới</Label>
                                        <Input 
                                            id="new" 
                                            type="password" 
                                            placeholder="••••••••"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2 max-w-md">
                                        <Label htmlFor="confirm">Xác nhận mật khẩu mới</Label>
                                        <Input 
                                            id="confirm" 
                                            type="password" 
                                            placeholder="••••••••"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <Button type="submit" disabled={isUpdatingPassword} className="mt-4 bg-[#2B64CE] hover:bg-blue-700">
                                        {isUpdatingPassword ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                        Cập nhật mật khẩu
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    )
}
