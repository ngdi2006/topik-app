import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const EVENT_NAMES = new Set([
    'lesson_started', 'lesson_completed',
    'exam_started', 'exam_completed',
    'question_answered', 'question_skipped',
    'practice_started', 'practice_completed', 'practice_retried',
])

type EventPayload = {
    eventName?: unknown
    source?: unknown
    contentType?: unknown
    contentId?: unknown
    sessionId?: unknown
    durationMs?: unknown
    isCorrect?: unknown
    metadata?: unknown
}

const optionalText = (value: unknown, maxLength: number) =>
    typeof value === 'string' && value.trim() ? value.trim().slice(0, maxLength) : null

export async function POST(request: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let payload: EventPayload
    try {
        payload = await request.json()
    } catch {
        return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 })
    }

    if (typeof payload.eventName !== 'string' || !EVENT_NAMES.has(payload.eventName)) {
        return NextResponse.json({ error: 'Loại sự kiện không hợp lệ' }, { status: 400 })
    }

    const durationMs = typeof payload.durationMs === 'number' && Number.isFinite(payload.durationMs)
        ? Math.max(0, Math.round(payload.durationMs))
        : null
    const metadata = payload.metadata && typeof payload.metadata === 'object' && !Array.isArray(payload.metadata)
        ? payload.metadata
        : {}

    const { error } = await supabase.from('learning_analytics_events').insert({
        user_id: user.id,
        event_name: payload.eventName,
        source: optionalText(payload.source, 40) || 'web',
        content_type: optionalText(payload.contentType, 60),
        content_id: optionalText(payload.contentId, 160),
        session_id: optionalText(payload.sessionId, 160),
        duration_ms: durationMs,
        is_correct: typeof payload.isCorrect === 'boolean' ? payload.isCorrect : null,
        metadata,
    })

    if (error) {
        console.error('Learning analytics event insert failed:', error.message)
        return NextResponse.json({ error: 'Không thể ghi nhận sự kiện' }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 201 })
}
