import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { permissionsForRole } from '@/lib/admin-permissions'

type LessonRow = {
    id: string
    lesson_number: number
    title_vietnamese: string
    chapter: number
}

type ProgressRow = {
    lesson_id: string
    progress_percent: number | null
    is_completed: boolean | null
    completed_sections: string[] | null
    last_accessed_at: string | null
}

type TextbookUnitRow = {
    id: string
    textbook_id: string
    unit_number: number
    title_vi: string | null
    start_page: number
    end_page: number
    textbooks: { title_vi?: string; volume?: number } | Array<{ title_vi?: string; volume?: number }> | null
}

type TextbookProgressRow = {
    textbook_id: string
    unit_id: string | null
    last_page: number
    progress_percent: number
    completed_units: number[] | null
    updated_at: string
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { data: profile } = await supabase
            .from('profiles')
            .select('role, admin_permissions')
            .eq('id', user.id)
            .single()

        if (!profile || !['admin', 'teacher', 'supporter'].includes(profile.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
        if (profile.role !== 'admin' && !permissionsForRole(profile.role, profile.admin_permissions).includes('users')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const { id: userId } = await context.params
        if (!userId) return NextResponse.json({ error: 'Missing user ID' }, { status: 400 })

        const admin = createAdminClient()
        const [lessonsResult, progressResult, attemptsResult, eventsResult, eventCountResult, unitsResult, textbookProgressResult, vocabularyCountResult, bookmarkCountResult, annotationCountResult, authUserResult, interviewLogsResult, interviewUsageResult, entitlementResult] = await Promise.all([
            admin.from('lessons')
                .select('id, lesson_number, title_vietnamese, chapter')
                .eq('is_published', true)
                .order('lesson_number', { ascending: true }),
            admin.from('user_progress')
                .select('lesson_id, progress_percent, is_completed, completed_sections, last_accessed_at')
                .eq('user_id', userId),
            admin.from('exam_attempts')
                .select('id, score, total_points, correct_count, wrong_count, started_at, completed_at, attempt_number, status, exams(id, title, level, total_questions, duration)')
                .eq('user_id', userId)
                .order('started_at', { ascending: false }),
            admin.from('learning_analytics_events')
                .select('id, event_name, content_type, content_id, session_id, duration_ms, is_correct, metadata, occurred_at')
                .eq('user_id', userId)
                .order('occurred_at', { ascending: false })
                .limit(100),
            admin.from('learning_analytics_events')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', userId),
            admin.from('textbook_units')
                .select('id, textbook_id, unit_number, title_vi, start_page, end_page, textbooks!inner(title_vi, volume, is_published)')
                .eq('is_published', true)
                .eq('textbooks.is_published', true)
                .order('sort_order', { ascending: true }),
            admin.from('user_textbook_progress')
                .select('textbook_id, unit_id, last_page, progress_percent, completed_units, updated_at')
                .eq('user_id', userId),
            admin.from('user_vocabulary_progress').select('user_id', { count: 'exact', head: true }).eq('user_id', userId),
            admin.from('user_textbook_bookmarks').select('id', { count: 'exact', head: true }).eq('user_id', userId),
            admin.from('user_textbook_annotations').select('id', { count: 'exact', head: true }).eq('user_id', userId),
            admin.auth.admin.getUserById(userId),
            admin.from('interview_api_usage_logs').select('id, feature, status, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(100),
            admin.from('interview_ai_daily_usage').select('usage_date, used_count, updated_at').eq('user_id', userId).order('usage_date', { ascending: false }).limit(365),
            admin.from('user_interview_entitlements').select('status, starts_at, expires_at').eq('user_id', userId).order('expires_at', { ascending: false }).limit(1).maybeSingle(),
        ])

        if (lessonsResult.error) throw lessonsResult.error
        if (progressResult.error) throw progressResult.error
        if (attemptsResult.error) throw attemptsResult.error

        const progressByLesson = new Map(
            ((progressResult.data || []) as ProgressRow[]).map((item) => [item.lesson_id, item]),
        )
        const legacyLessons = ((lessonsResult.data || []) as LessonRow[]).map((lesson) => {
            const progress = progressByLesson.get(lesson.id)
            const percent = progress?.is_completed ? 100 : Math.max(0, Math.min(100, progress?.progress_percent || 0))
            return {
                id: lesson.id,
                lessonNumber: lesson.lesson_number,
                title: lesson.title_vietnamese,
                chapter: lesson.chapter,
                progressPercent: percent,
                status: percent >= 100 ? 'completed' : percent > 0 || progress ? 'in_progress' : 'not_started',
                completedSections: progress?.completed_sections || [],
                lastAccessedAt: progress?.last_accessed_at || null,
            }
        })

        const textbookProgressByBook = new Map(
            ((textbookProgressResult.data || []) as TextbookProgressRow[]).map(item => [item.textbook_id, item]),
        )
        const textbookLessons = ((unitsResult.data || []) as unknown as TextbookUnitRow[]).map(unit => {
            const progress = textbookProgressByBook.get(unit.textbook_id)
            // The reader currently persists the last page but never fills
            // completed_units. A unit before that page has therefore been passed;
            // the unit containing that page is the active one.
            const completed = progress?.completed_units?.includes(unit.unit_number)
                || Boolean(progress && progress.last_page > unit.end_page)
            const touched = completed || progress?.unit_id === unit.id
                || Boolean(progress && progress.last_page >= unit.start_page && progress.last_page <= unit.end_page)
            const pages = Math.max(1, unit.end_page - unit.start_page + 1)
            const unitPercent = completed ? 100 : touched ? Math.max(1, Math.min(99, Math.round(((progress!.last_page - unit.start_page + 1) / pages) * 100))) : 0
            const book = Array.isArray(unit.textbooks) ? unit.textbooks[0] : unit.textbooks
            return {
                id: unit.id,
                lessonNumber: unit.unit_number,
                title: `${book?.title_vi || `Quyển ${book?.volume || ''}`} · ${unit.title_vi || `Bài ${unit.unit_number}`}`,
                chapter: book?.volume || 0,
                progressPercent: unitPercent,
                status: completed ? 'completed' as const : touched ? 'in_progress' as const : 'not_started' as const,
                completedSections: completed ? ['Toàn bộ bài'] : touched ? [`Đã xem đến trang ${progress!.last_page}`] : [],
                lastAccessedAt: touched ? progress?.updated_at || null : null,
            }
        })
        // The current learner experience uses digital-textbook units. Keep the
        // legacy lesson source as a fallback for installations without textbooks.
        const lessons = textbookLessons.length > 0 ? textbookLessons : legacyLessons

        const attempts = (attemptsResult.data || []).map((attempt) => {
            const startedAt = new Date(attempt.started_at).getTime()
            const completedAt = attempt.completed_at ? new Date(attempt.completed_at).getTime() : startedAt
            const totalPoints = attempt.total_points || 0
            const isStaleAttempt = attempt.status !== 'completed' && Date.now() - startedAt > 24 * 60 * 60 * 1000
            return {
                id: attempt.id,
                status: isStaleAttempt ? 'abandoned' : attempt.status,
                score: totalPoints > 0 ? Math.round((attempt.score / totalPoints) * 100) : 0,
                raw_score: attempt.score,
                total_points: attempt.total_points,
                total_correct: attempt.correct_count,
                wrong_count: attempt.wrong_count,
                time_taken: Math.max(0, Math.floor((completedAt - startedAt) / 1000)),
                created_at: attempt.completed_at || attempt.started_at,
                attempt_number: attempt.attempt_number,
                exams: attempt.exams,
            }
        })

        const completedLessons = lessons.filter((lesson) => lesson.status === 'completed').length
        const inProgressLessons = lessons.filter((lesson) => lesson.status === 'in_progress').length
        const storedEvents = eventsResult.error ? [] : eventsResult.data || []
        const fallbackExamEvents = attempts.slice(0, 100).map(attempt => ({
            id: `exam-${attempt.id}`,
            event_name: attempt.status === 'completed' ? 'exam_completed' : 'exam_started',
            content_type: 'exam',
            content_id: (attempt.exams as { title?: string } | null)?.title || null,
            session_id: attempt.id,
            duration_ms: attempt.time_taken * 1000,
            is_correct: null,
            metadata: {},
            occurred_at: attempt.created_at,
        }))
        const fallbackTextbookEvents = ((textbookProgressResult.data || []) as TextbookProgressRow[]).map(progress => ({
            id: `textbook-${progress.textbook_id}`,
            event_name: progress.progress_percent >= 100 ? 'lesson_completed' : 'lesson_started',
            content_type: 'textbook',
            content_id: progress.textbook_id,
            session_id: null,
            duration_ms: null,
            is_correct: null,
            metadata: {},
            occurred_at: progress.updated_at,
        }))
        const events = storedEvents.length > 0
            ? storedEvents
            : [...fallbackExamEvents, ...fallbackTextbookEvents].sort((a, b) => Date.parse(b.occurred_at) - Date.parse(a.occurred_at)).slice(0, 100)
        const latestActivityAt = [
            events[0]?.occurred_at,
            attempts[0]?.created_at,
            ...lessons.map((lesson) => lesson.lastAccessedAt),
        ].filter(Boolean).sort().at(-1) || null
        const interviewSnapshot = authUserResult.data.user?.user_metadata?.interview_progress_snapshot
        const interviewLogs = interviewLogsResult.error ? [] : interviewLogsResult.data || []
        const interviewUsage = interviewUsageResult.error ? [] : interviewUsageResult.data || []
        const interviewTopics = Array.isArray(interviewSnapshot?.topics) ? interviewSnapshot.topics : []
        const interviewExams = Array.isArray(interviewSnapshot?.exams) ? interviewSnapshot.exams : []

        return NextResponse.json({
            success: true,
            summary: {
                totalLessons: lessons.length,
                completedLessons,
                inProgressLessons,
                notStartedLessons: lessons.length - completedLessons - inProgressLessons,
                completedExams: attempts.filter((attempt) => attempt.status === 'completed').length,
                inProgressExams: attempts.filter((attempt) => attempt.status !== 'completed').length,
                interactionCount: Math.max(
                    eventCountResult.error ? 0 : eventCountResult.count || 0,
                    attempts.length
                        + (textbookProgressResult.data?.length || 0)
                        + (vocabularyCountResult.count || 0)
                        + (bookmarkCountResult.count || 0)
                        + (annotationCountResult.count || 0),
                ),
                latestActivityAt,
            },
            lessons,
            attempts,
            history: attempts.filter((attempt) => attempt.status === 'completed'),
            events,
            interview: {
                syncedAt: interviewSnapshot?.updatedAt || null,
                topics: interviewTopics,
                exams: interviewExams,
                practicedTopics: interviewTopics.filter((topic: { attempted?: number }) => Number(topic.attempted) > 0).length,
                totalAttempted: interviewTopics.reduce((sum: number, topic: { attempted?: number }) => sum + Number(topic.attempted || 0), 0),
                totalMastered: interviewTopics.reduce((sum: number, topic: { mastered?: number }) => sum + Number(topic.mastered || 0), 0),
                needsReview: interviewTopics.reduce((sum: number, topic: { incorrect?: number }) => sum + Number(topic.incorrect || 0), 0),
                aiEvaluations: interviewLogs.filter(log => log.status === 'success').length,
                aiUses: interviewUsage.reduce((sum, usage) => sum + Number(usage.used_count || 0), 0),
                entitlement: entitlementResult.error ? null : entitlementResult.data,
            },
        }, { status: 200 })
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal Server Error'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
