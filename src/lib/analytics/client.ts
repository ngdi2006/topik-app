'use client'

export type LearningEvent = {
    eventName: 'lesson_started' | 'lesson_completed' | 'exam_started' | 'exam_completed' | 'question_answered' | 'question_skipped' | 'practice_started' | 'practice_completed' | 'practice_retried'
    source?: string
    contentType?: string
    contentId?: string
    sessionId?: string
    durationMs?: number
    isCorrect?: boolean
    metadata?: Record<string, string | number | boolean | null>
}

/** Fire-and-forget tracking: analytics never blocks the learner interaction. */
export function trackLearningEvent(event: LearningEvent) {
    const body = JSON.stringify(event)
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        const accepted = navigator.sendBeacon('/api/analytics/events', new Blob([body], { type: 'application/json' }))
        if (accepted) return
    }

    void fetch('/api/analytics/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
    }).catch(() => undefined)
}
