import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { KOREAN_PRONUNCIATION_VERSION, toKoreanPronunciationText } from '../src/lib/korean-pronunciation.ts'

dotenv.config({ path: '.env.local' })

const execute = process.argv.includes('--execute')
const setupOnly = process.argv.includes('--setup')
const bucket = process.env.SUPABASE_TTS_BUCKET || 'tts-audio'
const voiceId = process.env.ELEVENLABS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB'
const modelId = process.env.ELEVENLABS_TTS_MODEL || 'eleven_multilingual_v2'
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const elevenLabsKey = process.env.ELEVENLABS_API_KEY

if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY')
}
if (execute && !setupOnly && !elevenLabsKey) {
    throw new Error('Thiếu ELEVENLABS_API_KEY')
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
})

function hashText(text) {
    return crypto.createHash('sha256').update(`${text}_${voiceId}_${KOREAN_PRONUNCIATION_VERSION}`).digest('hex')
}

function storagePath(text) {
    return `${voiceId}/${hashText(text)}.mp3`
}

async function loadAllRows(table, columns) {
    const pageSize = 1000
    const rows = []

    for (let from = 0; ; from += pageSize) {
        const { data, error } = await supabase
            .from(table)
            .select(columns)
            .range(from, from + pageSize - 1)

        if (error) throw error
        rows.push(...(data || []))
        if (!data || data.length < pageSize) break
    }

    return rows
}

async function objectExists(objectPath) {
    const folder = path.posix.dirname(objectPath)
    const fileName = path.posix.basename(objectPath)
    const { data, error } = await supabase.storage.from(bucket).list(folder, {
        search: fileName,
        limit: 1,
    })

    if (error) throw error
    return Boolean(data?.some((item) => item.name === fileName))
}

async function readLegacyAudio(text) {
    const filePath = path.join(process.cwd(), 'public', 'audio', 'tts', `${hashText(text)}.mp3`)
    try {
        return await fs.readFile(filePath)
    } catch {
        return null
    }
}

async function generateAudio(text) {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
            'xi-api-key': elevenLabsKey,
            'Content-Type': 'application/json',
            accept: 'audio/mpeg',
        },
        body: JSON.stringify({
            text,
            model_id: modelId,
            language_code: 'ko',
            voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
    })

    if (!response.ok) {
        throw new Error(`ElevenLabs ${response.status}: ${await response.text()}`)
    }
    return Buffer.from(await response.arrayBuffer())
}

async function ensureBucket() {
    const { data } = await supabase.storage.getBucket(bucket)
    if (data) return

    const { error } = await supabase.storage.createBucket(bucket, {
        public: true,
        fileSizeLimit: 10 * 1024 * 1024,
        allowedMimeTypes: ['audio/mpeg', 'audio/mp3'],
    })
    if (error) throw error
}

if (setupOnly) {
    await ensureBucket()
    console.log(`Bucket "${bucket}" đã sẵn sàng. Chưa tạo âm thanh.`)
    process.exit(0)
}

const [questions, vocabulary] = await Promise.all([
    loadAllRows('interview_questions', 'id,question_text,question_audio_url'),
    loadAllRows('vocabulary_vong2', 'id,word_kr,audio_url'),
])

const records = [
    ...questions.map((row) => ({
        table: 'interview_questions',
        id: row.id,
        text: row.question_text,
        urlColumn: 'question_audio_url',
    })),
    ...vocabulary.map((row) => ({
        table: 'vocabulary_vong2',
        id: row.id,
        text: toKoreanPronunciationText(row.word_kr),
        urlColumn: 'audio_url',
    })),
].filter((row) => row.text?.trim())

const uniqueTexts = [...new Set(records.map((row) => row.text.trim()))]
console.log(`Tìm thấy ${records.length} bản ghi, ${uniqueTexts.length} nội dung âm thanh duy nhất.`)

if (!execute) {
    console.log('Chế độ xem trước: chưa gọi ElevenLabs và chưa ghi Supabase.')
    console.log('Khi đã mua credits, chạy: npm run tts:generate -- --execute')
    process.exit(0)
}

await ensureBucket()

let reused = 0
let uploadedLegacy = 0
let generated = 0
let failed = 0
let stoppedForQuota = false
const publicUrls = new Map()
const pendingGeneration = []

// Phase 1: reuse every object already stored and upload every legacy local MP3.
// This phase never consumes ElevenLabs credits.
for (const [index, text] of uniqueTexts.entries()) {
    const objectPath = storagePath(text)
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${objectPath}`

    try {
        if (await objectExists(objectPath)) {
            reused += 1
            publicUrls.set(text, publicUrl)
        } else {
            const legacyAudio = await readLegacyAudio(text)
            if (legacyAudio) {
                const { error } = await supabase.storage.from(bucket).upload(objectPath, legacyAudio, {
                    contentType: 'audio/mpeg',
                    cacheControl: '31536000',
                    upsert: false,
                })
                if (error) throw error
                uploadedLegacy += 1
                publicUrls.set(text, publicUrl)
            } else {
                pendingGeneration.push({ index, text, objectPath, publicUrl })
            }
        }
    } catch (error) {
        failed += 1
        console.error(`[cache ${index + 1}/${uniqueTexts.length}] Lỗi:`, error.message)
    }
}

console.log(`Cache sẵn có: ${publicUrls.size}; cần ElevenLabs: ${pendingGeneration.length}.`)

// Phase 2: generate only truly missing audio. Stop immediately if the plan runs
// out of credits, while still persisting database URLs for completed objects.
for (const { index, text, objectPath, publicUrl } of pendingGeneration) {
    try {
        const audio = await generateAudio(text)
        const { error } = await supabase.storage.from(bucket).upload(objectPath, audio, {
            contentType: 'audio/mpeg',
            cacheControl: '31536000',
            upsert: false,
        })
        if (error) throw error

        generated += 1
        publicUrls.set(text, publicUrl)
        console.log(`[${index + 1}/${uniqueTexts.length}] OK`)
    } catch (error) {
        failed += 1
        console.error(`[${index + 1}/${uniqueTexts.length}] Lỗi:`, error.message)
        if (error.message.includes('quota_exceeded')) {
            stoppedForQuota = true
            console.error('Đã dừng sớm vì ElevenLabs hết credits. Có thể chạy lại an toàn sau khi nạp thêm.')
            break
        }
    }
}

for (const record of records) {
    const publicUrl = publicUrls.get(record.text.trim())
    if (!publicUrl) continue

    const { error } = await supabase
        .from(record.table)
        .update({ [record.urlColumn]: publicUrl })
        .eq('id', record.id)
    if (error) console.error(`Không cập nhật được ${record.table}/${record.id}: ${error.message}`)
}

console.log({
    reused,
    uploadedLegacy,
    generated,
    failed,
    remaining: uniqueTexts.length - publicUrls.size,
    stoppedForQuota,
})
if (failed > 0) process.exitCode = stoppedForQuota ? 2 : 1
