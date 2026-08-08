import { NextResponse } from 'next/server'
import { getOrCreateSpeechAudio } from '@/lib/server/tts-storage'
import { MATH_TTS_PROFILE } from '@/lib/math-tts'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const MAX_TTS_CHARACTERS = 1000
const TTS_REQUESTS_PER_MINUTE = 30
const requestWindows = new Map<string, { count: number; startedAt: number }>()

export async function GET(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const now = Date.now()
        const currentWindow = requestWindows.get(user.id)
        const rateWindow = !currentWindow || now - currentWindow.startedAt >= 60_000
            ? { count: 0, startedAt: now }
            : currentWindow
        if (rateWindow.count >= TTS_REQUESTS_PER_MINUTE) {
            return NextResponse.json({ error: 'Bạn đang yêu cầu phát âm quá nhanh. Vui lòng thử lại sau.' }, { status: 429 })
        }
        rateWindow.count += 1
        requestWindows.set(user.id, rateWindow)

        const { searchParams } = new URL(request.url)
        const text = searchParams.get('text')?.trim()
        const requestedProfile = searchParams.get('profile')
        const profile = requestedProfile === MATH_TTS_PROFILE ? MATH_TTS_PROFILE : 'default'

        if (!text) {
            return NextResponse.json({ error: 'Text query parameter is required' }, { status: 400 })
        }
        if (text.length > MAX_TTS_CHARACTERS) {
            return NextResponse.json({ error: `Text must not exceed ${MAX_TTS_CHARACTERS} characters` }, { status: 413 })
        }

        const audio = await getOrCreateSpeechAudio(text, profile)
        console.info(`[TTS] ${audio.source}: "${text.substring(0, 30)}"`)

        return new NextResponse(new Blob([new Uint8Array(audio.buffer)], { type: 'audio/mpeg' }), {
            headers: {
                'Content-Type': 'audio/mpeg',
                'Content-Length': audio.buffer.length.toString(),
                'Cache-Control': 'public, max-age=31536000, immutable',
                'X-TTS-Source': audio.source,
            },
        })
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown TTS error'
        console.error('[ElevenLabs TTS] Server Exception:', error)
        return NextResponse.json({ error: 'Không thể tải hoặc tạo âm thanh', message }, { status: 503 })
    }
}
