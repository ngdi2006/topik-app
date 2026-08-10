import crypto from 'node:crypto'
import process from 'node:process'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import {
    KOREAN_PRONUNCIATION_VERSION,
    toKoreanPronunciationText,
} from '../src/lib/korean-pronunciation.ts'

dotenv.config({ path: '.env.local' })

const VOCAB_IDS = [
    '25aca34c-a166-4176-bd4e-c5ffd9f88563', // 누전차단기
    '9e625d50-9071-4b29-89b3-71cc1888221d', // 전기 드릴
    'e4b287b7-f9d3-49d6-bb62-b24b75271612', // 마대
    '259bd581-6c1a-4233-830f-1eab5d005086', // 줄자
    '5131148c-a6fe-4530-ae3c-27a9b66a5185', // 파렛트
    'ad7e0433-be35-4ac1-8a3c-c3d6de87f924', // 니퍼
    'f355fc45-1d7f-4fa0-92f6-e1ab88920d13', // 리머
    '1ce20bcb-2bea-4f1f-88f9-fb85a83bf3da', // 핸드 절단기
    '2243bf7f-f6ed-488c-aa12-7b3e45edc529', // 전기 절단기
    'f7a12089-c724-4a0c-97a9-49d89dfe016b', // 혼합기
    '0c742dc8-859e-4bfa-878f-197567984507', // 자
    'e451b465-280d-40c1-a462-04403936eb54', // 테이블톱과 날물
    '6b07984b-9e42-49a4-88d3-74700e8865a3', // 줄
    '606db038-bff6-447e-847d-3545069b550a', // 붓
    'ecd2ae0c-c039-43b3-8511-1c213e0e4213', // 보안경
    '12cf8258-8776-4fde-bb13-736e1306a1ac', // 수준기
    '07503ea4-64bf-4429-9ff8-e2801915af47', // 나사못
    'fe65880c-b794-4565-a96c-2ab6107960b1', // 암나사(너트)
    'd02da563-e18f-44c1-a6a7-a70c30fd4fb4', // 수나사(볼트)
    '282252f6-9276-4dab-9029-93940e8a206e', // 자동 심장박동기
]

const requestedId = process.argv.find((argument) => argument.startsWith('--id='))?.slice(5)
const targetIds = requestedId ? VOCAB_IDS.filter((id) => id === requestedId) : VOCAB_IDS
if (requestedId && targetIds.length === 0) {
    throw new Error(`ID không thuộc danh sách phát âm cần sửa: ${requestedId}`)
}

const bucket = process.env.SUPABASE_TTS_BUCKET || 'tts-audio'
const voiceId = process.env.ELEVENLABS_VOICE_ID || 'PDoCXqBQFGsvfO0hNkEs'
const modelId = process.env.ELEVENLABS_TTS_MODEL || 'eleven_multilingual_v2'
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const elevenLabsKey = process.env.ELEVENLABS_API_KEY

if (!supabaseUrl || !serviceRoleKey || !elevenLabsKey) {
    throw new Error('Thiếu cấu hình Supabase hoặc ELEVENLABS_API_KEY')
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
})

function storagePath(text) {
    const hash = crypto.createHash('sha256')
        .update(`${text}_${voiceId}_${KOREAN_PRONUNCIATION_VERSION}`)
        .digest('hex')
    return `${voiceId}/${hash}.mp3`
}

async function generate(text) {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
        method: 'POST',
        headers: {
            'xi-api-key': elevenLabsKey,
            'Content-Type': 'application/json',
            accept: 'audio/mpeg',
        },
        body: JSON.stringify({
            text,
            model_id: modelId,
            voice_settings: {
                stability: 0.55,
                similarity_boost: 0.8,
                style: 0.15,
                use_speaker_boost: true,
            },
        }),
    })
    if (!response.ok) throw new Error(`ElevenLabs ${response.status}: ${await response.text()}`)
    return Buffer.from(await response.arrayBuffer())
}

const { data: vocabulary, error: loadError } = await supabase
    .from('vocabulary_vong2')
    .select('id,word_kr')
    .in('id', targetIds)
if (loadError) throw loadError

let completed = 0
for (const item of vocabulary || []) {
    const spokenText = toKoreanPronunciationText(item.word_kr)
    const objectPath = storagePath(spokenText)
    const audio = await generate(spokenText)
    const { error: uploadError } = await supabase.storage.from(bucket).upload(objectPath, audio, {
        contentType: 'audio/mpeg',
        cacheControl: '31536000',
        upsert: true,
    })
    if (uploadError) throw uploadError

    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${objectPath}`
    const { error: updateError } = await supabase
        .from('vocabulary_vong2')
        .update({ audio_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', item.id)
    if (updateError) throw updateError

    completed += 1
    console.log(`[${completed}/${vocabulary.length}] ${item.word_kr}`)
}

console.log(`Đã tạo và lưu ${completed} file âm thanh từ vựng.`)
