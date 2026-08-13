"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { History, LogOut, Settings, User as UserIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { createClient } from "@/lib/supabase/client"
import { useUserStore } from "@/store/userStore"

type ProfileSummary = {
    full_name: string | null
    avatar_url: string | null
}

export function UserNav() {
    const { user, role, setUser } = useUserStore()
    const router = useRouter()
    const supabase = useMemo(() => createClient(), [])
    const [isProfileOpen, setIsProfileOpen] = useState(false)
    const [profile, setProfile] = useState<ProfileSummary | null>(null)

    useEffect(() => {
        if (!user?.id) {
            setProfile(null)
            return
        }

        let active = true
        void supabase
            .from("profiles")
            .select("full_name, avatar_url")
            .eq("id", user.id)
            .maybeSingle()
            .then(({ data }) => {
                if (active && data) setProfile(data)
            })

        return () => {
            active = false
        }
    }, [supabase, user?.id])

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        setUser(null)
        router.push("/")
    }

    const displayName = profile?.full_name
        || user?.user_metadata?.full_name
        || user?.user_metadata?.name
        || user?.email?.split("@")[0]
        || "Học viên"
    const avatarUrl = profile?.avatar_url
        || user?.user_metadata?.avatar_url
        || user?.user_metadata?.picture
        || null
    const initials = displayName
        .trim()
        .split(/\s+/)
        .slice(-2)
        .map((part: string) => part[0])
        .join("")
        .toUpperCase() || "U"

    const renderAvatar = (sizeClass: string) => (
        <span className={`relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-blue-500 to-violet-600 font-bold text-white ring-1 ring-blue-100 ${sizeClass}`}>
            {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt="" className="size-full object-cover" referrerPolicy="no-referrer" src={avatarUrl} />
            ) : (
                <span aria-hidden="true">{initials}</span>
            )}
            <span aria-hidden="true" className="absolute bottom-0 right-0 size-2 rounded-full border-2 border-white bg-emerald-500" />
        </span>
    )

    return (
        <div className="flex items-center">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        aria-label={`Mở tài khoản ${displayName}`}
                        variant="ghost"
                        className="size-10 rounded-full border-0 bg-transparent p-0 shadow-none transition hover:bg-transparent hover:opacity-90 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 sm:size-11"
                    >
                        {renderAvatar("size-10 text-xs sm:size-11 sm:text-sm")}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-60" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                        <div className="flex items-center gap-3">
                            {renderAvatar("size-10 text-xs")}
                            <div className="min-w-0 space-y-1">
                                <p className="truncate text-sm font-semibold text-slate-900">{displayName}</p>
                                <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                            </div>
                        </div>
                        {role ? (
                            <span className={`mt-3 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                                role === "admin" ? "bg-purple-100 text-purple-700" :
                                role === "teacher" ? "bg-yellow-100 text-yellow-700" :
                                role === "supporter" ? "bg-cyan-100 text-cyan-700" :
                                "bg-blue-100 text-blue-700"
                            }`}>
                                {role}
                            </span>
                        ) : null}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                        <DropdownMenuItem className="cursor-pointer" onSelect={(event) => {
                            event.preventDefault()
                            setIsProfileOpen(true)
                        }}>
                            <UserIcon className="mr-2 size-4" />
                            Hồ sơ của tôi
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer" onSelect={(event) => {
                            event.preventDefault()
                            router.push("/settings")
                        }}>
                            <Settings className="mr-2 size-4" />
                            Cài đặt
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer" onSelect={(event) => {
                            event.preventDefault()
                            router.push("/history")
                        }}>
                            <History className="mr-2 size-4 text-blue-600" />
                            Lịch sử làm bài
                        </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-700" onClick={handleSignOut}>
                        <LogOut className="mr-2 size-4" />
                        Đăng xuất
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Hồ sơ cá nhân</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col items-center justify-center space-y-4 py-6">
                        {renderAvatar("size-20 text-2xl")}
                        <div className="max-w-full space-y-1 text-center">
                            <h3 className="truncate text-xl font-semibold tracking-tight">{displayName}</h3>
                            <p className="truncate text-sm text-muted-foreground">{user?.email}</p>
                        </div>
                        {role ? (
                            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
                                {role}
                            </span>
                        ) : null}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
