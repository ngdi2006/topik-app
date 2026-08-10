import 'server-only'

import crypto from 'crypto'
import fs from 'fs/promises'
import path from 'path'
import { createAdminClient } from '@/lib/supabase/admin'
import {
    MATH_TTS_PROFILE,
    toMathPacedText,
} from '@/lib/math-tts'
import { KOREAN_PRONUNCIATION_VERSION, toKoreanPronunciationText } from '@/lib/korean-pronunciation'

export const TTS_BUCKET = process.env.SUPABASE_TTS_BUCKET || 'tts-audio'
export const TTS_MODEL = process.env.ELEVENLABS_TTS_MODEL || 'eleven_multilingual_v2'
export const DEFAULT_TTS_VOICE_ID = 'PDoCXqBQFGsvfO0hNkEs'

type SpeechSource = 'supabase' | 'legacy-local-cache' | 'elevenlabs'
export type TtsStorageProfile = 'default' | typeof MATH_TTS_PROFILE

export interface SpeechAudio {
    buffer: Buffer
    source: SpeechSource
    storagePath: string
    publicUrl: string | null
}

const pendingGenerations = new Map<string, Promise<SpeechAudio>>()

export function getTtsVoiceId() {
    return process.env.ELEVENLABS_VOICE_ID || DEFAULT_TTS_VOICE_ID
}

function getSpeechText(text: string, profile: TtsStorageProfile) {
    return profile === MATH_TTS_PROFILE ? toMathPacedText(text) : toKoreanPronunciationText(text)
}

export function getTtsHash(
    text: string,
    voiceId = getTtsVoiceId(),
    profile: TtsStorageProfile = 'default',
) {
    const speechText = getSpeechText(text, profile)
    const cacheKey = profile === 'default'
        ? `${speechText}_${voiceId}_${KOREAN_PRONUNCIATION_VERSION}`
        : `${speechText}_${voiceId}_${profile}`
    return crypto.createHash('sha256').update(cacheKey).digest('hex')
}

export function getTtsStoragePath(
    text: string,
    voiceId = getTtsVoiceId(),
    profile: TtsStorageProfile = 'default',
) {
    const fileName = `${getTtsHash(text, voiceId, profile)}.mp3`
    return profile === 'default'
        ? `${voiceId}/${fileName}`
        : `${voiceId}/${profile}/${fileName}`
}

function getPublicUrl(storagePath: string) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl) return null

    return `${supabaseUrl}/storage/v1/object/public/${TTS_BUCKET}/${storagePath}`
}

async function downloadFromSupabase(storagePath: string) {
    const adminClient = createAdminClient()
    const { data, error } = await adminClient.storage.from(TTS_BUCKET).download(storagePath)

    if (error || !data) return null
    return Buffer.from(await data.arrayBuffer())
}

async function readLegacyLocalCache(text: string, voiceId: string) {
    const filePath = path.join(
        process.cwd(),
        'public',
        'audio',
        'tts',
        `${getTtsHash(text, voiceId)}.mp3`
    )

    try {
        return await fs.readFile(filePath)
    } catch {
        return null
    }
}

async function uploadToSupabase(storagePath: string, buffer: Buffer) {
    const adminClient = createAdminClient()
    const { error } = await adminClient.storage.from(TTS_BUCKET).upload(storagePath, buffer, {
        contentType: 'audio/mpeg',
        cacheControl: '31536000',
        upsert: true,
    })

    if (error) {
        throw new Error(`Không thể lưu âm thanh vào Supabase Storage: ${error.message}`)
    }
}

async function generateWithElevenLabs(text: string, voiceId: string) {
    const apiKey = process.env.ELEVENLABS_API_KEY
    if (!apiKey) {
        throw new Error('ELEVENLABS_API_KEY chưa được cấu hình')
    }

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
        method: 'POST',
        headers: {
            'xi-api-key': apiKey,
            'Content-Type': 'application/json',
            accept: 'audio/mpeg',
        },
        body: JSON.stringify({
            text,
            model_id: TTS_MODEL,
            voice_settings: {
                stability: 0.55,
                similarity_boost: 0.8,
                style: 0.15,
                use_speaker_boost: true,
            },
        }),
    })

    if (!response.ok) {
        const details = await response.text()
        throw new Error(`ElevenLabs trả về ${response.status}: ${details}`)
    }

    return Buffer.from(await response.arrayBuffer())
}

async function resolveSpeechAudio(
    text: string,
    profile: TtsStorageProfile,
): Promise<SpeechAudio> {
    const voiceId = getTtsVoiceId()
    const storagePath = getTtsStoragePath(text, voiceId, profile)
    const publicUrl = getPublicUrl(storagePath)

    const storedAudio = await downloadFromSupabase(storagePath)
    if (storedAudio) {
        return { buffer: storedAudio, source: 'supabase', storagePath, publicUrl }
    }

    const legacyAudio = profile === 'default'
        ? await readLegacyLocalCache(text, voiceId)
        : null
    if (legacyAudio) {
        await uploadToSupabase(storagePath, legacyAudio)
        return { buffer: legacyAudio, source: 'legacy-local-cache', storagePath, publicUrl }
    }

    const generatedAudio = await generateWithElevenLabs(
        getSpeechText(text, profile),
        voiceId,
    )
    await uploadToSupabase(storagePath, generatedAudio)

    return { buffer: generatedAudio, source: 'elevenlabs', storagePath, publicUrl }
}

export function getOrCreateSpeechAudio(
    text: string,
    profile: TtsStorageProfile = 'default',
) {
    const normalizedText = text.trim()
    if (!normalizedText) {
        return Promise.reject(new Error('Nội dung đọc không được để trống'))
    }

    const key = getTtsStoragePath(normalizedText, getTtsVoiceId(), profile)
    const existingRequest = pendingGenerations.get(key)
    if (existingRequest) return existingRequest

    const request = resolveSpeechAudio(normalizedText, profile).finally(() => {
        pendingGenerations.delete(key)
    })
    pendingGenerations.set(key, request)
    return request
}
