import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import {
    KOREAN_PRONUNCIATION_VERSION,
    toKoreanPronunciationText,
} from '../src/lib/korean-pronunciation.ts'

dotenv.config({ path: '.env.local' })

const execute = process.argv.includes('--execute')
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const elevenLabsKey = process.env.ELEVENLABS_API_KEY
const voiceId = process.env.ELEVENLABS_VOICE_ID || 'PDoCXqBQFGsvfO0hNkEs'
const modelId = process.env.ELEVENLABS_TTS_MODEL || 'eleven_multilingual_v2'
const imageBucket = 'question-media'
const audioBucket = process.env.SUPABASE_TTS_BUCKET || 'tts-audio'
const imageDirectory = path.join(process.cwd(), '.codex-tmp', 'tv-bo-sung')

if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Thiếu cấu hình Supabase')
}
if (execute && !elevenLabsKey) {
    throw new Error('Thiếu ELEVENLABS_API_KEY')
}

const vocabulary = [
    { word_kr: '방호덮개', word_vi: 'Nắp che bảo vệ', image: 'protective-cover.jpg' },
    { word_kr: '에어건', word_vi: 'Súng xịt khí nén', image: 'air-gun.jpg' },
    { word_kr: '유압펌프', word_vi: 'Bơm thủy lực', image: 'hydraulic-pump.jpg' },
    { word_kr: '인두기', word_vi: 'Mỏ hàn', image: 'soldering-iron.jpg' },
    { word_kr: '가스켓', word_vi: 'Vòng đệm', image: 'gasket.jpg' },
    { word_kr: '수평기', word_vi: 'Thước thủy', image: 'spirit-level.jpg' },
    { word_kr: '적외선 온도계', word_vi: 'Nhiệt kế hồng ngoại', image: 'infrared-thermometer.jpg' },
    { word_kr: '롱노즈 플라이어', word_vi: 'Kìm mũi nhọn', image: 'long-nose-pliers.jpg' },
    { word_kr: '절연테이프', word_vi: 'Băng dính cách điện', image: 'insulation-tape.jpg' },
    { word_kr: '케이블타이', word_vi: 'Dây rút nhựa', image: 'cable-tie.jpg' },
]

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
})

function audioObjectPath(text) {
    const hash = crypto.createHash('sha256')
        .update(`${text}_${voiceId}_${KOREAN_PRONUNCIATION_VERSION}`)
        .digest('hex')
    return `${voiceId}/${hash}.mp3`
}

async function objectExists(bucket, objectPath) {
    const separator = objectPath.lastIndexOf('/')
    const folder = separator >= 0 ? objectPath.slice(0, separator) : ''
    const fileName = separator >= 0 ? objectPath.slice(separator + 1) : objectPath
    const { data, error } = await supabase.storage.from(bucket).list(folder, {
        limit: 1,
        search: fileName,
    })
    if (error) throw error
    return (data || []).some((item) => item.name === fileName)
}

async function ensureImage(item) {
    const objectPath = `vocab-vong2/supplemental-2026/${item.image}`
    if (!await objectExists(imageBucket, objectPath)) {
        const image = await fs.readFile(path.join(imageDirectory, item.image))
        const { error } = await supabase.storage.from(imageBucket).upload(objectPath, image, {
            contentType: 'image/jpeg',
            cacheControl: '31536000',
            upsert: false,
        })
        if (error) throw error
    }
    return `${supabaseUrl}/storage/v1/object/public/${imageBucket}/${objectPath}`
}

async function ensureAudio(word) {
    const spokenText = toKoreanPronunciationText(word)
    const objectPath = audioObjectPath(spokenText)
    if (!await objectExists(audioBucket, objectPath)) {
        const response = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
            {
                method: 'POST',
                headers: {
                    'xi-api-key': elevenLabsKey,
                    'Content-Type': 'application/json',
                    accept: 'audio/mpeg',
                },
                body: JSON.stringify({
                    text: spokenText,
                    model_id: modelId,
                    voice_settings: {
                        stability: 0.55,
                        similarity_boost: 0.8,
                        style: 0.15,
                        use_speaker_boost: true,
                    },
                }),
                signal: AbortSignal.timeout(45_000),
            },
        )
        if (!response.ok) {
            throw new Error(`ElevenLabs ${response.status}: ${await response.text()}`)
        }
        const audio = Buffer.from(await response.arrayBuffer())
        const { error } = await supabase.storage.from(audioBucket).upload(objectPath, audio, {
            contentType: 'audio/mpeg',
            cacheControl: '31536000',
            upsert: false,
        })
        if (error) throw error
    }
    return `${supabaseUrl}/storage/v1/object/public/${audioBucket}/${objectPath}`
}

const words = vocabulary.map((item) => item.word_kr)
const { data: existing, error: loadError } = await supabase
    .from('vocabulary_vong2')
    .select('word_kr')
    .eq('industry', 'MANUFACTURING')
    .in('word_kr', words)
if (loadError) throw loadError

const existingWords = new Set((existing || []).map((item) => item.word_kr))
const pending = vocabulary.filter((item) => !existingWords.has(item.word_kr))

console.log(JSON.stringify({ total: vocabulary.length, existing: existingWords.size, pending: pending.length }, null, 2))
if (!execute) {
    console.log('Chế độ xem trước; thêm --execute để nhập dữ liệu.')
    process.exit(0)
}

let inserted = 0
for (const item of pending) {
    const imageUrl = await ensureImage(item)
    const audioUrl = await ensureAudio(item.word_kr)
    const { error } = await supabase.from('vocabulary_vong2').insert({
        industry: 'MANUFACTURING',
        type: 'TOOL',
        word_kr: item.word_kr,
        word_vi: item.word_vi,
        image_url: imageUrl,
        audio_url: audioUrl,
    })
    if (error) throw error
    inserted += 1
    console.log(`[${inserted}/${pending.length}] ${item.word_kr} — ${item.word_vi}`)
}

console.log(JSON.stringify({ inserted, skipped: existingWords.size }, null, 2))
