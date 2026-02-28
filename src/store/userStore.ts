import { create } from 'zustand'
import { User } from '@supabase/supabase-js'

interface UserState {
    user: User | null
    role: string | null
    setUser: (user: User | null) => void
    setRole: (role: string | null) => void
    isLoading: boolean
    setIsLoading: (isLoading: boolean) => void
}

export const useUserStore = create<UserState>((set) => ({
    user: null,
    role: null,
    setUser: (user) => set({ user }),
    setRole: (role) => set({ role }),
    isLoading: true,
    setIsLoading: (isLoading) => set({ isLoading }),
}))
