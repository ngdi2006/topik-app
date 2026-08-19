import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getInterviewAccess } from '@/features/interview-access/server'
import {
    getCachedSpeechAudio,
    getOrCreateSpeechAudio,
} from '@/lib/server/tts-storage'

export const maxDuration = 60

const FREE_DAILY_LIMIT = 1
const MEMBER_DAILY_LIMIT = 3
const MAX_INTRODUCTION_CHARACTERS = 500
const QUOTA_METADATA_KEY = 'self_introduction_tts_quota'

function describeGenerationError(error: unknown) {
    const details = error instanceof Error ? error.message : ''
    if (/ElevenLabs trả về (401|403)/.test(details) || details.includes('ELEVENLABS_API_KEY')) {
        return {
            code: 'ELEVENLABS_AUTH',
            message: 'Dịch vụ tạo giọng trên máy chủ chưa được cấu hình đúng. Hệ thống đã hoàn lại lượt.',
        }
    }
    if (details.includes('ElevenLabs trả về 429')) {
        return {
            code: 'ELEVENLABS_LIMIT',
            message: 'Dịch vụ tạo giọng đã đạt giới hạn sử dụng. Hệ thống đã hoàn lại lượt.',
        }
    }
    if (details.includes('Không thể lưu âm thanh vào Supabase Storage')) {
        return {
            code: 'STORAGE_UPLOAD',
            message: 'Đã tạo được giọng nhưng máy chủ chưa thể lưu file âm thanh. Hệ thống đã hoàn lại lượt.',
        }
    }
    if (/ElevenLabs trả về 5\d\d/.test(details)) {
        return {
            code: 'ELEVENLABS_UNAVAILABLE',
            message: 'Dịch vụ tạo giọng đang tạm gián đoạn. Hệ thống đã hoàn lại lượt, vui lòng thử lại sau.',
        }
    }
    return {
        code: 'TTS_UNKNOWN',
        message: 'Tạo giọng thất bại do lỗi hệ thống. Lượt đã được hoàn lại; quản trị viên cần kiểm tra log máy chủ.',
    }
}

function normalizeSpeechText(text: string) {
    return text.trim().replace(/\s+/g, ' ')
}

function getBangkokDate() {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date())
}

function readMetadataUsage(metadata: Record<string, unknown>) {
    const quota = metadata[QUOTA_METADATA_KEY] as { date?: string; used?: number } | undefined
    return quota?.date === getBangkokDate() ? Math.max(0, Number(quota.used) || 0) : 0
}

async function getSavedText(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, metadata: Record<string, unknown>) {
    const { data } = await supabase
        .from('user_self_introduction_drafts')
        .select('text')
        .eq('user_id', userId)
        .maybeSingle()
    const metadataDraft = metadata.self_introduction_draft as { text?: string } | undefined
    return normalizeSpeechText(data?.text || metadataDraft?.text || '')
}

async function getTodayUsage(userId: string) {
    const admin = createAdminClient()
    const { data, error } = await admin.auth.admin.getUserById(userId)
    if (error) throw error
    return readMetadataUsage((data.user?.app_metadata || {}) as Record<string, unknown>)
}

type GenerationReservation = {
    allowed: boolean
    used: number
    daily_limit: number
    counted: boolean
}

async function reserveInMetadata(userId: string, limit: number): Promise<GenerationReservation> {
    const admin = createAdminClient()
    const { data, error } = await admin.auth.admin.getUserById(userId)
    if (error || !data.user) throw error || new Error('Không tìm thấy người dùng')

    const appMetadata = (data.user.app_metadata || {}) as Record<string, unknown>
    const used = readMetadataUsage(appMetadata)
    if (used >= limit) {
        return { allowed: false, used, daily_limit: limit, counted: false }
    }

    const nextUsed = used + 1
    const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
        app_metadata: {
            ...appMetadata,
            [QUOTA_METADATA_KEY]: { date: getBangkokDate(), used: nextUsed },
        },
    })
    if (updateError) throw updateError
    return { allowed: true, used: nextUsed, daily_limit: limit, counted: true }
}

async function rollbackMetadataReservation(userId: string) {
    const admin = createAdminClient()
    const { data } = await admin.auth.admin.getUserById(userId)
    if (!data.user) return
    const appMetadata = (data.user.app_metadata || {}) as Record<string, unknown>
    const used = readMetadataUsage(appMetadata)
    await admin.auth.admin.updateUserById(userId, {
        app_metadata: {
            ...appMetadata,
            [QUOTA_METADATA_KEY]: { date: getBangkokDate(), used: Math.max(0, used - 1) },
        },
    })
}

async function reserveGeneration(
    userId: string,
    limit: number,
): Promise<GenerationReservation> {
    return reserveInMetadata(userId, limit)
}

export async function GET() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const [text, access, used] = await Promise.all([
            getSavedText(supabase, user.id, user.user_metadata || {}),
            getInterviewAccess(supabase, user),
            getTodayUsage(user.id),
        ])
        const limit = access.hasFullAccess ? MEMBER_DAILY_LIMIT : FREE_DAILY_LIMIT
        const cached = text ? await getCachedSpeechAudio(text) : null

        return NextResponse.json({
            hasAudio: Boolean(cached?.publicUrl),
            audioUrl: cached?.publicUrl || null,
            used,
            limit,
            remaining: Math.max(0, limit - used),
        })
    } catch (error) {
        console.error('[Self introduction TTS quota status]', error)
        return NextResponse.json({ error: 'Chưa thể kiểm tra lượt tạo giọng. Vui lòng thử lại.' }, { status: 503 })
    }
}

export async function POST(request: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json() as { text?: string }
    const text = normalizeSpeechText(body.text || '')
    if (!text || text.length > MAX_INTRODUCTION_CHARACTERS) {
        return NextResponse.json({ error: 'Bài giới thiệu không hợp lệ' }, { status: 400 })
    }

    const savedText = await getSavedText(supabase, user.id, user.user_metadata || {})
    if (!savedText || savedText !== text) {
        return NextResponse.json({ error: 'Hãy lưu bài cá nhân trước khi tạo giọng đọc' }, { status: 409 })
    }

    const access = await getInterviewAccess(supabase, user)
    const limit = access.hasFullAccess ? MEMBER_DAILY_LIMIT : FREE_DAILY_LIMIT
    const cached = await getCachedSpeechAudio(text)
    if (cached?.publicUrl) {
        const used = await getTodayUsage(user.id)
        return NextResponse.json({
            audioUrl: cached.publicUrl,
            cached: true,
            used,
            limit,
            remaining: Math.max(0, limit - used),
        })
    }

    let reservation: GenerationReservation
    try {
        reservation = await reserveGeneration(user.id, limit)
    } catch (error) {
        console.error('[Self introduction TTS quota reservation]', error)
        return NextResponse.json({ error: 'Chưa thể kiểm tra lượt tạo giọng. Vui lòng thử lại.' }, { status: 503 })
    }
    if (!reservation?.allowed) {
        return NextResponse.json({
            error: 'Bạn đã dùng hết lượt tạo giọng hôm nay. Bản hiện tại vẫn có thể nghe lại không giới hạn.',
            used: Number(reservation?.used || limit),
            limit,
            remaining: 0,
        }, { status: 429 })
    }

    try {
        const audio = await getOrCreateSpeechAudio(text)
        if (!audio.publicUrl) throw new Error('Không tạo được đường dẫn âm thanh')
        return NextResponse.json({
            audioUrl: audio.publicUrl,
            cached: audio.source !== 'elevenlabs',
            used: Number(reservation.used || 0),
            limit,
            remaining: Math.max(0, limit - Number(reservation.used || 0)),
        })
    } catch (error) {
        if (reservation.counted) {
            await rollbackMetadataReservation(user.id)
        }
        console.error('[Self introduction TTS]', error)
        const failure = describeGenerationError(error)
        return NextResponse.json({ error: failure.message, errorCode: failure.code }, { status: 503 })
    }
}
