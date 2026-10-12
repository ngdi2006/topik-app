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
const imageDirectory = path.join(process.cwd(), '.codex-tmp', 'fishery-supplement', 'images')

if (!supabaseUrl || !serviceRoleKey) throw new Error('Thiếu cấu hình Supabase')
if (execute && !elevenLabsKey) throw new Error('Thiếu ELEVENLABS_API_KEY')

const vocabulary = [
  { word_kr: '뜸줄', word_vi: 'Dây phao / dây nổi', image: 'float-line.png' },
  { word_kr: '발줄', word_vi: 'Dây chì / dây chìm', image: 'lead-line.png' },
  { word_kr: '선별판', word_vi: 'Khay phân loại', image: 'sorting-tray.png' },
  { word_kr: '굴칼', word_vi: 'Dao cạy hàu', image: 'oyster-knife.png' },
  { word_kr: '선수', word_vi: 'Mũi tàu', image: 'bow.png' },
  { word_kr: '선미', word_vi: 'Đuôi tàu', image: 'stern.png' },
  { word_kr: '염도계', word_vi: 'Máy đo độ mặn', image: 'salinity-meter.png' },
  { word_kr: '조상기', word_vi: 'Máy thu dây câu', image: 'line-hauler.png' },
  { word_kr: '갑판 청소솔', aliases: ['갑판청소솔'], word_vi: 'Chổi vệ sinh boong tàu', image: 'deck-brush.png' },
  { word_kr: '침자', word_vi: 'Chì câu / chì lưới', image: 'sinker.png' },
  { word_kr: '수온계', word_vi: 'Máy đo nhiệt độ nước', image: 'water-thermometer.png' },
  { word_kr: '고무장갑', word_vi: 'Găng tay cao su', image: 'rubber-gloves.png' },
  { word_kr: '방수 앞치마', aliases: ['방수앞치마'], word_vi: 'Tạp dề chống nước', image: 'waterproof-apron.png' },
  { word_kr: '바가지', word_vi: 'Gáo', image: 'scoop.png' },
  { word_kr: '투망', word_vi: 'Lưới quăng', image: 'cast-net.png' },
  { word_kr: '작업복', word_vi: 'Quần áo làm việc', image: 'work-clothes.png' },
]

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const normalizeKorean = value => String(value || '').replace(/\s+/g, '')

function audioObjectPath(text) {
  return `${voiceId}/${crypto.createHash('sha256').update(`${text}_${voiceId}_${KOREAN_PRONUNCIATION_VERSION}`).digest('hex')}.mp3`
}

async function objectExists(bucket, objectPath) {
  const separator = objectPath.lastIndexOf('/')
  const folder = separator >= 0 ? objectPath.slice(0, separator) : ''
  const fileName = separator >= 0 ? objectPath.slice(separator + 1) : objectPath
  const { data, error } = await supabase.storage.from(bucket).list(folder, { limit: 10, search: fileName })
  if (error) throw error
  return (data || []).some(item => item.name === fileName)
}

async function ensureImage(item) {
  const objectPath = `vocab-vong2/fishery-supplement-2026/${item.image}`
  if (!await objectExists(imageBucket, objectPath)) {
    const image = await fs.readFile(path.join(imageDirectory, item.image))
    const { error } = await supabase.storage.from(imageBucket).upload(objectPath, image, {
      contentType: 'image/png',
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
        headers: { 'xi-api-key': elevenLabsKey, 'Content-Type': 'application/json', accept: 'audio/mpeg' },
        body: JSON.stringify({
          text: spokenText,
          model_id: modelId,
          voice_settings: { stability: 0.55, similarity_boost: 0.8, style: 0.15, use_speaker_boost: true },
        }),
        signal: AbortSignal.timeout(45_000),
      },
    )
    if (!response.ok) throw new Error(`ElevenLabs ${response.status}: ${await response.text()}`)
    const audio = Buffer.from(await response.arrayBuffer())
    const { error } = await supabase.storage.from(audioBucket).upload(objectPath, audio, {
      contentType: 'audio/mpeg', cacheControl: '31536000', upsert: false,
    })
    if (error) throw error
  }
  return `${supabaseUrl}/storage/v1/object/public/${audioBucket}/${objectPath}`
}

const { data: existing, error: loadError } = await supabase
  .from('vocabulary_vong2')
  .select('id,word_kr,word_vi,image_url,audio_url')
  .eq('industry', 'FISHERY')
if (loadError) throw loadError

const existingByWord = new Map((existing || []).map(item => [normalizeKorean(item.word_kr), item]))
const plan = vocabulary.map(item => ({
  ...item,
  existing: existingByWord.get(normalizeKorean(item.word_kr))
    || (item.aliases || []).map(normalizeKorean).map(alias => existingByWord.get(alias)).find(Boolean)
    || null,
}))

console.log(JSON.stringify({
  sourceItems: vocabulary.length,
  insert: plan.filter(item => !item.existing).map(item => `${item.word_kr} — ${item.word_vi}`),
  updateImage: plan.filter(item => item.existing).map(item => `${item.existing.word_kr} — ${item.existing.word_vi}`),
}, null, 2))

if (!execute) {
  console.log('Chế độ xem trước; thêm --execute để nhập dữ liệu.')
  process.exit(0)
}

let inserted = 0
let updated = 0
for (const item of plan) {
  const imageUrl = await ensureImage(item)
  if (item.existing) {
    const { error } = await supabase.from('vocabulary_vong2').update({ image_url: imageUrl }).eq('id', item.existing.id)
    if (error) throw error
    updated += 1
    console.log(`[update ${updated}] ${item.existing.word_kr} — cập nhật ảnh gốc PDF`)
    continue
  }

  const audioUrl = await ensureAudio(item.word_kr)
  const { error } = await supabase.from('vocabulary_vong2').insert({
    industry: 'FISHERY',
    type: 'TOOL',
    word_kr: item.word_kr,
    word_vi: item.word_vi,
    image_url: imageUrl,
    audio_url: audioUrl,
  })
  if (error) throw error
  inserted += 1
  console.log(`[insert ${inserted}] ${item.word_kr} — ${item.word_vi}`)
}

console.log(JSON.stringify({ inserted, updated, expectedFisheryTotal: (existing || []).length + inserted }, null, 2))
