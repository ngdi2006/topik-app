'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

type PresenceContext = {
    country: string | null
    region: string | null
    city: string | null
    device: 'desktop' | 'tablet' | 'mobile'
    browser: string
}

const EMPTY_CONTEXT: PresenceContext = { country: null, region: null, city: null, device: 'desktop', browser: 'Khác' }
const CONTEXT_CACHE_KEY = 'topik-presence-context-v1'
const CONTEXT_CACHE_TTL = 30 * 60 * 1000

function cachedPresenceContext() {
    try {
        const cached = JSON.parse(sessionStorage.getItem(CONTEXT_CACHE_KEY) || 'null') as { value?: PresenceContext; expiresAt?: number } | null
        return cached?.value && Number(cached.expiresAt) > Date.now() ? cached.value : null
    } catch {
        return null
    }
}

async function getPresenceContext(signal: AbortSignal): Promise<PresenceContext> {
    const cached = cachedPresenceContext()
    if (cached) return cached
    try {
        const response = await fetch('/api/presence/context', { signal })
        if (!response.ok) return EMPTY_CONTEXT
        const value = await response.json() as PresenceContext
        try {
            sessionStorage.setItem(CONTEXT_CACHE_KEY, JSON.stringify({ value, expiresAt: Date.now() + CONTEXT_CACHE_TTL }))
        } catch {
            // Trình duyệt có thể chặn sessionStorage; Presence vẫn hoạt động bình thường.
        }
        return value
    } catch {
        return EMPTY_CONTEXT
    }
}

export function PresenceTracker() {
    const channelRef = useRef<RealtimeChannel | null>(null)
    const presenceRef = useRef<Record<string, unknown> | null>(null)
    const pathname = usePathname()

    useEffect(() => {
        const supabase = createClient()
        let disposed = false
        let initialization = 0
        let controller: AbortController | null = null
        let timeout: number | null = null
        let authRetryTimer: ReturnType<typeof setTimeout> | null = null

        const disconnect = () => {
            if (timeout !== null) window.clearTimeout(timeout)
            if (authRetryTimer !== null) window.clearTimeout(authRetryTimer)
            authRetryTimer = null
            controller?.abort()
            controller = null
            const channel = channelRef.current
            channelRef.current = null
            presenceRef.current = null
            if (channel) void supabase.removeChannel(channel)
        }

        const initPresence = async () => {
            const currentInitialization = ++initialization
            disconnect()
            if (disposed || document.hidden) return
            let session = null
            try {
                const result = await supabase.auth.getSession()
                session = result.data.session
            } catch {
                // Presence là tính năng phụ. Lỗi khóa auth không được làm hỏng trang chính.
                if (!disposed && !document.hidden) {
                    authRetryTimer = setTimeout(() => {
                        authRetryTimer = null
                        void initPresence()
                    }, 3000)
                }
                return
            }
            if (!session?.user || disposed || document.hidden || currentInitialization !== initialization) return

            controller = new AbortController()
            timeout = window.setTimeout(() => controller?.abort(), 1500)
            const context = await getPresenceContext(controller.signal)
            if (timeout !== null) window.clearTimeout(timeout)
            timeout = null
            if (disposed || document.hidden || currentInitialization !== initialization) return
            const userId = session.user.id
            const channel = supabase.channel('global-presence', { config: { presence: { key: userId } } })
            channelRef.current = channel

            channel.subscribe(async (status) => {
                if (status !== 'SUBSCRIBED') return
                const presence = {
                    online_at: new Date().toISOString(),
                    is_guest: false,
                    current_page: window.location.pathname,
                    ...context,
                }
                presenceRef.current = presence
                try {
                    await channel.track(presence)
                } catch {
                    // Supabase Realtime tự kết nối lại; không làm gián đoạn trải nghiệm học.
                }
            })
        }

        const handlePageHide = () => disconnect()
        const handlePageShow = (event: PageTransitionEvent) => {
            if (event.persisted || !channelRef.current) void initPresence()
        }
        const handleVisibilityChange = () => {
            if (document.hidden) disconnect()
            else if (!channelRef.current) void initPresence()
        }

        window.addEventListener('pagehide', handlePageHide)
        window.addEventListener('pageshow', handlePageShow)
        document.addEventListener('visibilitychange', handleVisibilityChange)
        // Đợi các tác vụ khôi phục/xác thực phiên chính hoàn tất trước khi bật Presence.
        authRetryTimer = setTimeout(() => {
            authRetryTimer = null
            void initPresence()
        }, 1200)
        return () => {
            disposed = true
            initialization += 1
            window.removeEventListener('pagehide', handlePageHide)
            window.removeEventListener('pageshow', handlePageShow)
            document.removeEventListener('visibilitychange', handleVisibilityChange)
            disconnect()
        }
    }, [])

    useEffect(() => {
        if (!channelRef.current || !presenceRef.current) return
        const presence = { ...presenceRef.current, current_page: pathname, online_at: new Date().toISOString() }
        presenceRef.current = presence
        void channelRef.current.track(presence)
    }, [pathname])

    return null
}
