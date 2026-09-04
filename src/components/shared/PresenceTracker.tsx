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

async function getPresenceContext(signal: AbortSignal): Promise<PresenceContext> {
    try {
        const response = await fetch('/api/presence/context', { signal })
        if (!response.ok) return EMPTY_CONTEXT
        return await response.json() as PresenceContext
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
        let controller: AbortController | null = null
        let timeout: number | null = null

        const disconnect = () => {
            if (timeout !== null) window.clearTimeout(timeout)
            controller?.abort()
            controller = null
            const channel = channelRef.current
            channelRef.current = null
            presenceRef.current = null
            if (channel) void supabase.removeChannel(channel)
            // WebSocket đang mở khiến trình duyệt không thể khôi phục trang sạch từ BFCache.
            supabase.realtime.disconnect()
        }

        const initPresence = async () => {
            disconnect()
            if (disposed || document.hidden) return
            controller = new AbortController()
            timeout = window.setTimeout(() => controller?.abort(), 1500)
            const [{ data: { session } }, context] = await Promise.all([
                supabase.auth.getSession(),
                getPresenceContext(controller.signal),
            ])
            if (timeout !== null) window.clearTimeout(timeout)
            timeout = null
            if (disposed || document.hidden) return
            const userId = session?.user?.id || `guest-${Math.random().toString(36).substring(7)}`
            const channel = supabase.channel('global-presence', { config: { presence: { key: userId } } })
            channelRef.current = channel

            channel.subscribe(async (status) => {
                if (status !== 'SUBSCRIBED') return
                const presence = {
                    online_at: new Date().toISOString(),
                    is_guest: !session?.user,
                    current_page: window.location.pathname,
                    ...context,
                }
                presenceRef.current = presence
                await channel.track(presence)
            })
        }

        const handlePageHide = () => disconnect()
        const handlePageShow = (event: PageTransitionEvent) => {
            if (event.persisted || !channelRef.current) void initPresence()
        }

        window.addEventListener('pagehide', handlePageHide)
        window.addEventListener('pageshow', handlePageShow)
        void initPresence()
        return () => {
            disposed = true
            window.removeEventListener('pagehide', handlePageHide)
            window.removeEventListener('pageshow', handlePageShow)
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
