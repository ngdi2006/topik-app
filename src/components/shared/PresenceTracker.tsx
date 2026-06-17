'use client'
import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

export function PresenceTracker() {
    const channelRef = useRef<any>(null)

    useEffect(() => {
        const supabase = createClient()
        
        const initPresence = async () => {
            // Lấy session hiện tại để gán ID
            const { data: { session } } = await supabase.auth.getSession()
            const userId = session?.user?.id || 'guest-' + Math.random().toString(36).substring(7)
            
            const channel = supabase.channel('global-presence', {
                config: {
                    presence: {
                        key: userId,
                    },
                },
            })

            channelRef.current = channel

            channel.subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({
                        online_at: new Date().toISOString(),
                        is_guest: !session?.user
                    })
                }
            })
        }

        initPresence()

        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current)
            }
        }
    }, [])

    return null
}
