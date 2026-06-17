'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export function OnlineUsersCounter() {
    const [onlineCount, setOnlineCount] = useState(0)
    
    useEffect(() => {
        const supabase = createClient()
        const channel = supabase.channel('global-presence')

        channel
            .on('presence', { event: 'sync' }, () => {
                const newState = channel.presenceState()
                const uniqueUsers = Object.keys(newState).length
                setOnlineCount(uniqueUsers)
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    return (
        <div className="text-2xl font-bold text-green-500 animate-pulse">{onlineCount}</div>
    )
}
