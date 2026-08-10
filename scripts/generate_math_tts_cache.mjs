import crypto from 'node:crypto'
import process from 'node:process'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import {
    MATH_TTS_PROFILE,
    countSpeechBreaks,
    toMathPacedText,
} from '../src/lib/math-tts.ts'

dotenv.config({ path: '.env.local' })

const execute = process.argv.includes('--execute')
const limitArg = process.argv.find((arg) => arg.startsWith('--limit='))
const requestedLimit = limitArg ? Number(limitArg.split('=')[1]) : Number.POSITIVE_INFINITY
const bucket = process.env.SUPABASE_TTS_BUCKET || 'tts-audio'
const voiceId = process.env.ELEVENLABS_VOICE_ID || 'PDoCXqBQFGsvfO0hNkEs'
const modelId = process.env.ELEVENLABS_TTS_MODEL || 'eleven_multilingual_v2'
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const elevenLabsKey = process.env.ELEVENLABS_API_KEY

if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Thiếu cấu hình Supabase')
}
if (execute && !elevenLabsKey) {
    throw new Error('Thiếu ELEVENLABS_API_KEY')
}
if (!Number.isFinite(requestedLimit) && requestedLimit !== Number.POSITIVE_INFINITY) {
    throw new Error('--limit phải là một số dương')
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
})

function storagePath(text) {
    const speechText = toMathPacedText(text)
    const hash = crypto
        .createHash('sha256')
        .update(`${speechText}_${voiceId}_${MATH_TTS_PROFILE}`)
        .digest('hex')
    return `${voiceId}/${MATH_TTS_PROFILE}/${hash}.mp3`
}

async function loadMathQuestions() {
    const pageSize = 1000
    const rows = []

    for (let from = 0; ; from += pageSize) {
        const { data, error } = await supabase
            .from('interview_questions')
            .select('id,question_text,question_audio_url')
            .eq('category', 'Toán học')
            .range(from, from + pageSize - 1)

        if (error) throw error
        rows.push(...(data || []))
        if (!data || data.length < pageSize) break
    }
    return rows
}

async function objectExists(objectPath) {
    const slashIndex = objectPath.lastIndexOf('/')
    const folder = objectPath.slice(0, slashIndex)
    const fileName = objectPath.slice(slashIndex + 1)
    const { data, error } = await supabase.storage.from(bucket).list(folder, {
        search: fileName,
        limit: 1,
    })
    if (error) throw error
    return Boolean(data?.some((item) => item.name === fileName))
}

async function generateAudio(text) {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
        method: 'POST',
        headers: {
            'xi-api-key': elevenLabsKey,
            'Content-Type': 'application/json',
            accept: 'audio/mpeg',
        },
        body: JSON.stringify({
            text: toMathPacedText(text),
            model_id: modelId,
            voice_settings: {
                stability: 0.55,
                similarity_boost: 0.8,
                style: 0.15,
                use_speaker_boost: true,
            },
        }),
    })
    if (!response.ok) {
        throw new Error(`ElevenLabs ${response.status}: ${await response.text()}`)
    }
    return Buffer.from(await response.arrayBuffer())
}

const rows = await loadMathQuestions()
const uniqueTexts = [...new Set(rows.map((row) => row.question_text?.trim()).filter(Boolean))]
const limitedTexts = uniqueTexts.slice(0, requestedLimit)

console.log(`Toán học: ${rows.length} bản ghi, ${uniqueTexts.length} câu đọc duy nhất.`)
console.log(`Profile: ${MATH_TTS_PROFILE}; voice: ${voiceId.slice(0, 3)}...${voiceId.slice(-3)}.`)

for (const [index, text] of limitedTexts.slice(0, 10).entries()) {
    console.log(`\nMẫu ${index + 1} (${countSpeechBreaks(text)} nhịp nghỉ):`)
    console.log(toMathPacedText(text))
}

if (!execute) {
    console.log('\nChế độ preview: chưa gọi ElevenLabs và chưa ghi Supabase.')
    console.log('Tạo 10 mẫu: npm run tts:math -- --execute --limit=10')
    console.log('Tạo toàn bộ: npm run tts:math -- --execute')
    process.exit(0)
}

let reused = 0
let generated = 0
let failed = 0
const publicUrls = new Map()

for (const [index, text] of limitedTexts.entries()) {
    const objectPath = storagePath(text)
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${objectPath}`
    try {
        if (await objectExists(objectPath)) {
            reused += 1
        } else {
            const audio = await generateAudio(text)
            const { error } = await supabase.storage.from(bucket).upload(objectPath, audio, {
                contentType: 'audio/mpeg',
                cacheControl: '31536000',
                upsert: false,
            })
            if (error) throw error
            generated += 1
        }
        publicUrls.set(text, publicUrl)
        console.log(`[${index + 1}/${limitedTexts.length}] OK`)
    } catch (error) {
        failed += 1
        console.error(`[${index + 1}/${limitedTexts.length}] Lỗi: ${error.message}`)
        if (error.message.includes('quota_exceeded')) break
    }
}

for (const row of rows) {
    const publicUrl = publicUrls.get(row.question_text?.trim())
    if (!publicUrl) continue
    const { error } = await supabase
        .from('interview_questions')
        .update({ question_audio_url: publicUrl })
        .eq('id', row.id)
    if (error) console.error(`Không cập nhật được ${row.id}: ${error.message}`)
}

console.log({
    reused,
    generated,
    failed,
    completed: publicUrls.size,
    remaining: uniqueTexts.length - publicUrls.size,
})
if (failed > 0) process.exitCode = 1
