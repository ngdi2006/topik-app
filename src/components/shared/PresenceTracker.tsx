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

const EMPTY_CONTEXT: PresenceContext = {
    country: null,
    region: null,
    city: null,
    device: 'desktop',
    browser: 'Khác',
}

const AUTH_PATHS = ['/login', '/register', '/forgot-password', '/reset-password', '/check-email']
const LEADER_RETRY_DELAY_MS = 5_000
const ROUTE_UPDATE_DELAY_MS = 1_000
const CONTEXT_TIMEOUT_MS = 1_500
const CONTEXT_CACHE_KEY = 'topik-presence-context-v1'
const CONTEXT_CACHE_TTL = 30 * 60 * 1000

function cachedPresenceContext(): PresenceContext | null {
    try {
        const cached = JSON.parse(sessionStorage.getItem(CONTEXT_CACHE_KEY) || 'null') as {
            value?: PresenceContext
            expiresAt?: number
        } | null
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
            sessionStorage.setItem(CONTEXT_CACHE_KEY, JSON.stringify({
                value,
                expiresAt: Date.now() + CONTEXT_CACHE_TTL,
            }))
        } catch {
            // Presence vẫn hoạt động nếu trình duyệt chặn sessionStorage.
        }
        return value
    } catch {
        return EMPTY_CONTEXT
    }
}

export function PresenceTracker() {
    const channelRef = useRef<RealtimeChannel | null>(null)
    const presenceRef = useRef<Record<string, unknown> | null>(null)
    const routeUpdateTimerRef = useRef<number | null>(null)
    const pathname = usePathname()
    const isAuthPage = AUTH_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))

    useEffect(() => {
        // Không theo dõi khách và không tranh khóa Auth tại các trang xác thực.
        if (isAuthPage) return

        const supabase = createClient()
        let disposed = false
        let starting = false
        let retryTimer: number | null = null
        let contextTimer: number | null = null
        let contextController: AbortController | null = null
        let releaseLeader: (() => void) | null = null

        const clearTimers = () => {
            if (retryTimer !== null) window.clearTimeout(retryTimer)
            if (contextTimer !== null) window.clearTimeout(contextTimer)
            retryTimer = null
            contextTimer = null
        }

        const disconnectChannel = () => {
            contextController?.abort()
            contextController = null

            const channel = channelRef.current
            channelRef.current = null
            presenceRef.current = null
            if (channel) void supabase.removeChannel(channel)

            // Không gọi supabase.realtime.disconnect(): thao tác đó sẽ ngắt cả
            // những kênh Realtime không thuộc Presence trong cùng trình duyệt.
        }

        const stopPresence = () => {
            clearTimers()
            disconnectChannel()
            releaseLeader?.()
            releaseLeader = null
        }

        const connectPresence = async (userId: string) => {
            if (disposed || document.hidden || channelRef.current) return

            contextController = new AbortController()
            contextTimer = window.setTimeout(() => contextController?.abort(), CONTEXT_TIMEOUT_MS)
            const context = await getPresenceContext(contextController.signal)

            if (contextTimer !== null) window.clearTimeout(contextTimer)
            contextTimer = null
            contextController = null
            if (disposed || document.hidden || channelRef.current) return

            const channel = supabase.channel('global-presence', {
                config: { presence: { key: userId } },
            })
            channelRef.current = channel

            channel.subscribe((status) => {
                if (status !== 'SUBSCRIBED' || disposed || document.hidden) return

                const presence = {
                    online_at: new Date().toISOString(),
                    is_guest: false,
                    current_page: window.location.pathname,
                    ...context,
                }
                presenceRef.current = presence
                void channel.track(presence).catch(() => undefined)
            })
        }

        const scheduleRetry = (start: () => void) => {
            if (disposed || document.hidden || retryTimer !== null) return
            retryTimer = window.setTimeout(() => {
                retryTimer = null
                start()
            }, LEADER_RETRY_DELAY_MS)
        }

        const startPresence = async () => {
            if (disposed || document.hidden || starting || channelRef.current || releaseLeader) return
            starting = true

            try {
                const { data: { session } } = await supabase.auth.getSession()
                const userId = session?.user?.id
                if (!userId || disposed || document.hidden) return

                // Web Locks bảo đảm mỗi tài khoản chỉ có một tab giữ kết nối Presence.
                // Trình duyệt cũ không hỗ trợ Web Locks vẫn được dùng theo cơ chế dự phòng.
                if (!('locks' in navigator)) {
                    await connectPresence(userId)
                    return
                }

                void navigator.locks.request(
                    `topik-presence:${userId}`,
                    { ifAvailable: true },
                    async (lock) => {
                        if (!lock || disposed || document.hidden) {
                            scheduleRetry(() => void startPresence())
                            return
                        }

                        await connectPresence(userId)
                        if (disposed || document.hidden) {
                            disconnectChannel()
                            return
                        }
                        await new Promise<void>((resolve) => {
                            releaseLeader = resolve
                        })
                        releaseLeader = null
                        disconnectChannel()
                    },
                ).catch(() => scheduleRetry(() => void startPresence()))
            } catch {
                // Presence là tính năng phụ, lỗi Auth/Realtime không được chặn trang.
                scheduleRetry(() => void startPresence())
            } finally {
                starting = false
            }
        }

        const handleVisibilityChange = () => {
            if (document.hidden) stopPresence()
            else void startPresence()
        }
        const handlePageHide = () => stopPresence()
        const handlePageShow = () => {
            if (!document.hidden) void startPresence()
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)
        window.addEventListener('pagehide', handlePageHide)
        window.addEventListener('pageshow', handlePageShow)
        void startPresence()

        return () => {
            disposed = true
            document.removeEventListener('visibilitychange', handleVisibilityChange)
            window.removeEventListener('pagehide', handlePageHide)
            window.removeEventListener('pageshow', handlePageShow)
            stopPresence()
        }
    }, [isAuthPage])

    useEffect(() => {
        if (routeUpdateTimerRef.current !== null) {
            window.clearTimeout(routeUpdateTimerRef.current)
        }

        routeUpdateTimerRef.current = window.setTimeout(() => {
            routeUpdateTimerRef.current = null
            const channel = channelRef.current
            const currentPresence = presenceRef.current
            if (!channel || !currentPresence || document.hidden) return

            const presence = {
                ...currentPresence,
                current_page: pathname,
                online_at: new Date().toISOString(),
            }
            presenceRef.current = presence
            void channel.track(presence).catch(() => undefined)
        }, ROUTE_UPDATE_DELAY_MS)

        return () => {
            if (routeUpdateTimerRef.current !== null) {
                window.clearTimeout(routeUpdateTimerRef.current)
                routeUpdateTimerRef.current = null
            }
        }
    }, [pathname])

    return null
}
