"use client"

import { useState } from "react"
import { useUserStore } from "@/store/userStore"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { LogOut, Settings, User as UserIcon, History } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

export function UserNav() {
    const { user, role, setUser } = useUserStore()
    const router = useRouter()
    const supabase = createClient()
    const [isProfileOpen, setIsProfileOpen] = useState(false)

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        setUser(null)
        router.push("/")
    }

    // Get initials for avatar
    const initials = user?.user_metadata?.full_name
        ? user.user_metadata.full_name.substring(0, 2).toUpperCase()
        : user?.email?.substring(0, 2).toUpperCase() || "U"

    return (
        <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-muted-foreground hidden sm:inline-block">
                Hi, {user?.user_metadata?.full_name || user?.email?.split('@')[0]} 👋
            </span>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors">
                        <div className="flex h-full w-full items-center justify-center text-primary font-bold">
                            {initials}
                        </div>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                            <p className="text-sm font-medium leading-none">
                                {user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Học viên"}
                            </p>
                            <p className="text-xs leading-none text-muted-foreground">
                                {user?.email}
                            </p>
                            {role && (
                                <div className="mt-2">
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold
                        ${role === 'admin' ? 'bg-purple-100 text-purple-700' :
                                            role === 'teacher' ? 'bg-yellow-100 text-yellow-700' :
                                                role === 'supporter' ? 'bg-cyan-100 text-cyan-700' :
                                                    'bg-blue-100 text-blue-700'}`}
                                    >
                                        {role}
                                    </span>
                                </div>
                            )}
                        </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                        <DropdownMenuItem className="cursor-pointer" onSelect={(e) => {
                            e.preventDefault()
                            setIsProfileOpen(true)
                        }}>
                            <UserIcon className="mr-2 h-4 w-4" />
                            <span>Hồ sơ của tôi</span>
                        </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                        <DropdownMenuItem className="cursor-pointer" onSelect={(e) => {
                            e.preventDefault()
                            router.push('/history')
                        }}>
                            <History className="mr-2 h-4 w-4 text-blue-600" />
                            <span>Lịch sử làm bài</span>
                        </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-red-600 focus:text-red-700 cursor-pointer" onClick={handleSignOut}>
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Đăng xuất</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Profile Dialog */}
            <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Hồ sơ cá nhân</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col items-center justify-center py-6 space-y-4">
                        <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-primary text-3xl font-bold">
                            {initials}
                        </div>
                        <div className="text-center space-y-1">
                            <h3 className="text-xl font-semibold tracking-tight">
                                {user?.user_metadata?.full_name || user?.email?.split('@')[0]}
                            </h3>
                            <p className="text-sm text-muted-foreground">{user?.email}</p>
                        </div>
                        {role && (
                            <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                                {role}
                            </span>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
