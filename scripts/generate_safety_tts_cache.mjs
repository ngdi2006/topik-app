import crypto from 'node:crypto'
import process from 'node:process'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { KOREAN_PRONUNCIATION_VERSION, toKoreanPronunciationText } from '../src/lib/korean-pronunciation.ts'

dotenv.config({ path: '.env.local' })

const execute = process.argv.includes('--execute')
const category = 'An toàn lao động'
const bucket = process.env.SUPABASE_TTS_BUCKET || 'tts-audio'
const voiceId = process.env.ELEVENLABS_VOICE_ID || 'PDoCXqBQFGsvfO0hNkEs'
const modelId = process.env.ELEVENLABS_TTS_MODEL || 'eleven_multilingual_v2'
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const elevenLabsKey = process.env.ELEVENLABS_API_KEY

if (!supabaseUrl || !serviceRoleKey) throw new Error('Thiếu cấu hình Supabase')
if (execute && !elevenLabsKey) throw new Error('Thiếu ELEVENLABS_API_KEY')

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
})

function storagePath(text) {
    const hash = crypto.createHash('sha256').update(`${text}_${voiceId}_${KOREAN_PRONUNCIATION_VERSION}`).digest('hex')
    return `${voiceId}/safety/${hash}.mp3`
}

async function generateAudio(text) {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
            method: 'POST',
            headers: { 'xi-api-key': elevenLabsKey, 'Content-Type': 'application/json', accept: 'audio/mpeg' },
            body: JSON.stringify({
                text,
                model_id: modelId,
                voice_settings: { stability: 0.62, similarity_boost: 0.82, style: 0.08, use_speaker_boost: true },
            }),
            signal: AbortSignal.timeout(45_000),
        })

        if (response.ok) return Buffer.from(await response.arrayBuffer())
        const message = `ElevenLabs ${response.status}: ${await response.text()}`
        if ((response.status < 500 && response.status !== 429) || attempt === 3) throw new Error(message)
        await new Promise((resolve) => setTimeout(resolve, attempt * 1_500))
    }
    throw new Error('ElevenLabs không phản hồi')
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

const { data: rows, error: loadError } = await supabase
    .from('interview_questions')
    .select('id,question_text,question_audio_url')
    .eq('category', category)
    .order('created_at', { ascending: true })
if (loadError) throw loadError

const validRows = (rows || []).filter((row) => row.question_text?.trim())
const groupedBySpeech = new Map()
for (const row of validRows) {
    const speechText = toKoreanPronunciationText(row.question_text.trim())
    const group = groupedBySpeech.get(speechText) || []
    group.push(row)
    groupedBySpeech.set(speechText, group)
}

console.log(`Phạm vi: ${category}; ${validRows.length} câu; ${groupedBySpeech.size} audio duy nhất.`)
console.log(`Voice: ${voiceId}; model: ${modelId}; bucket: ${bucket}.`)
if (!execute) {
    console.log('Chế độ xem trước. Chạy thêm --execute để tạo audio và cập nhật Supabase.')
    process.exit(0)
}

await ensureBucket()
let generated = 0
let reused = 0
let updated = 0
let failed = 0
let index = 0

for (const [speechText, questionRows] of groupedBySpeech.entries()) {
    index += 1
    const objectPath = storagePath(speechText)
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${objectPath}`
    try {
        const { data: existing } = await supabase.storage.from(bucket).download(objectPath)
        if (existing) {
            reused += 1
        } else {
            const audio = await generateAudio(speechText)
            const { error: uploadError } = await supabase.storage.from(bucket).upload(objectPath, audio, {
                contentType: 'audio/mpeg', cacheControl: '31536000', upsert: false,
            })
            if (uploadError) throw uploadError
            generated += 1
        }

        const ids = questionRows.map((row) => row.id)
        const { error: updateError } = await supabase
            .from('interview_questions')
            .update({ question_audio_url: publicUrl })
            .in('id', ids)
        if (updateError) throw updateError
        updated += ids.length
        console.log(`[${index}/${groupedBySpeech.size}] OK · ${ids.length} câu`)
    } catch (error) {
        failed += 1
        console.error(`[${index}/${groupedBySpeech.size}] Lỗi: ${error.message}`)
        if (error.message.includes('quota_exceeded')) break
    }
}

console.log({ generated, reused, updated, failed, totalQuestions: validRows.length })
if (failed > 0 || updated !== validRows.length) process.exitCode = 1
