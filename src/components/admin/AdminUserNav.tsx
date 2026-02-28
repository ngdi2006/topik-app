"use client"

import { useState } from "react"
import { useUserStore } from "@/store/userStore"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { LogOut, User as UserIcon, Settings } from "lucide-react"
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

export function AdminUserNav() {
    const { user, role } = useUserStore()
    const router = useRouter()
    const supabase = createClient()
    const [isProfileOpen, setIsProfileOpen] = useState(false)

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push("/login")
    }

    // Get initials for avatar
    const initials = user?.user_metadata?.full_name
        ? user.user_metadata.full_name.substring(0, 2).toUpperCase()
        : "A"

    return (
        <>
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
                                {user?.user_metadata?.full_name || "Admin User"}
                            </p>
                            <p className="text-xs leading-none text-muted-foreground">
                                {user?.email || "admin@example.com"}
                            </p>
                            {role && (
                                <div className="mt-2">
                                    <span className="bg-purple-100 text-purple-700 text-[10px] px-2 py-0.5 rounded-full uppercase font-bold">
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
                                {user?.user_metadata?.full_name || "Admin User"}
                            </h3>
                            <p className="text-sm text-muted-foreground">{user?.email}</p>
                        </div>
                        {role && (
                            <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                                {role}
                            </span>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}
