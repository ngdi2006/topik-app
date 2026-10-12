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
const imageDirectory = path.join(process.cwd(), '.codex-tmp', 'agriculture-import', 'images')

if (!supabaseUrl || !serviceRoleKey) throw new Error('Thiếu cấu hình Supabase')
if (execute && !elevenLabsKey) throw new Error('Thiếu ELEVENLABS_API_KEY')

// Thứ tự giữ nguyên theo tài liệu TV-NONGNGHIEP.pdf, đọc từ trái sang phải,
// từ trên xuống dưới. Ảnh được trích trực tiếp từ từng ô tương ứng trong PDF.
const vocabulary = [
  { word_kr: '경운기', word_vi: 'Máy cày', image: '001-cultivator.png' },
  { word_kr: '농약분무기', word_vi: 'Bình phun thuốc trừ sâu', image: '002-pesticide-sprayer.png' },
  { word_kr: '동력분무기', word_vi: 'Máy phun thuốc trừ sâu động cơ', image: '003-powered-sprayer.png' },
  { word_kr: '발전기', word_vi: 'Máy phát điện', image: '004-generator.png' },
  { word_kr: '스프링클러', word_vi: 'Vòi phun tưới nước', image: '005-sprinkler.png' },
  { word_kr: '양수기', word_vi: 'Máy bơm nước', image: '006-water-pump.png' },
  { word_kr: '예초기', word_vi: 'Máy cắt cỏ', image: '007-brush-cutter.png' },
  { word_kr: '이앙기', word_vi: 'Máy cấy lúa', image: '008-rice-transplanter.png' },
  { word_kr: '콤바인', word_vi: 'Máy gặt liên hoàn', image: '009-combine-harvester.png' },
  { word_kr: '트랙터', word_vi: 'Máy kéo', image: '010-tractor.png' },
  { word_kr: '파종기', word_vi: 'Máy gieo hạt', image: '011-seeder.png' },
  { word_kr: '일륜차', word_vi: 'Xe rùa', image: '012-wheelbarrow.png' },

  { word_kr: '갈퀴', word_vi: 'Cái cào', image: '013-rake.png' },
  { word_kr: '괭이', word_vi: 'Cuốc đào', image: '014-hoe.png' },
  { word_kr: '낫', word_vi: 'Liềm', image: '015-sickle.png' },
  { word_kr: '삽', word_vi: 'Xẻng', image: '016-shovel.png' },
  { word_kr: '손수레', word_vi: 'Xe kéo tay', image: '017-handcart.png' },
  { word_kr: '쇠스랑', word_vi: 'Cái chĩa', image: '018-pitchfork.png' },
  { word_kr: '양손가위', word_vi: 'Kéo cắt cành', image: '019-hedge-shears.png' },
  { word_kr: '전정가위', word_vi: 'Kéo tỉa cây', image: '020-pruning-shears.png' },
  { word_kr: '톱', word_vi: 'Cưa', image: '021-saw.png' },
  { word_kr: '호미', word_vi: 'Cuốc nhỏ', image: '022-hand-hoe.png' },
  { word_kr: '건초', word_vi: 'Cỏ khô', image: '023-hay.png' },
  { word_kr: '고무통', word_vi: 'Thùng cao su', image: '024-rubber-tub.png' },

  { word_kr: '쌀자루(마대)', word_vi: 'Bao gạo (bao tải)', image: '025-rice-sack.png' },
  { word_kr: '저울', word_vi: 'Cân', image: '026-scale.png' },
  { word_kr: '농약', word_vi: 'Thuốc trừ sâu', image: '027-pesticide.png' },
  { word_kr: '모종판', word_vi: 'Khay gieo hạt', image: '028-seedling-tray.png' },
  { word_kr: '바구니', word_vi: 'Giỏ, rổ', image: '029-basket.png' },
  { word_kr: '비닐하우스', word_vi: 'Nhà kính', image: '030-greenhouse.png' },
  { word_kr: '비료', word_vi: 'Phân bón', image: '031-fertilizer.png' },
  { word_kr: '사다리', word_vi: 'Thang', image: '032-ladder.png' },
  { word_kr: '사료', word_vi: 'Thức ăn gia súc', image: '033-livestock-feed.png' },
  { word_kr: '울타리망', word_vi: 'Lưới hàng rào', image: '034-fence-net.png' },
  { word_kr: '호스', word_vi: 'Vòi nước', image: '035-hose.png' },
  { word_kr: '지주대', word_vi: 'Cọc chống cây', image: '036-plant-support.png' },

  { word_kr: '농약방제복', word_vi: 'Quần áo bảo hộ thuốc trừ sâu', image: '037-pesticide-protective-clothing.png' },
  { word_kr: '안전장갑', word_vi: 'Găng tay bảo hộ', image: '038-safety-gloves.png' },
  { word_kr: '안전화', word_vi: 'Giày bảo hộ', image: '039-safety-shoes.png' },
  { word_kr: '작업복', word_vi: 'Quần áo làm việc', image: '040-work-clothes.png' },
  { word_kr: '절연용보호구', word_vi: 'Đồ bảo hộ cách điện', image: '041-insulated-protective-equipment.png' },
  { word_kr: '축산작업복', word_vi: 'Quần áo làm việc chăn nuôi', image: '042-livestock-work-clothes.png' },
  { word_kr: '바가지', word_vi: 'Gáo', image: '043-scoop.png' },
  { word_kr: '분뇨 탱크', word_vi: 'Thùng chứa phân', image: '044-manure-tank.png' },
  { word_kr: '봉지', word_vi: 'Túi, bao', image: '045-bag.png' },
  { word_kr: '축사', word_vi: 'Chuồng trại', image: '046-livestock-barn.png' },
  { word_kr: '짚', word_vi: 'Rơm', image: '047-straw.png' },
  { word_kr: '귀표', word_vi: 'Thẻ đánh dấu', image: '048-ear-tag.png' },
  { word_kr: '귀표펀칭기', word_vi: 'Dụng cụ bấm lỗ', image: '049-ear-tag-punch.png' },
  { word_kr: '멀칭비닐', word_vi: 'Tấm nilon phủ', image: '050-mulching-film.png' },
  { word_kr: '작업방석', word_vi: 'Ghế làm việc', image: '051-work-seat.png' },
  { word_kr: '전정기', word_vi: 'Máy tỉa hàng rào', image: '052-hedge-trimmer.png' },

  { word_kr: '대빗자루', word_vi: 'Chổi lớn', image: '053-large-broom.png' },
  { word_kr: '토시', word_vi: 'Ống tay bảo hộ', image: '054-protective-sleeves.png' },
  { word_kr: '물뿌리개', word_vi: 'Bình tưới nước', image: '055-watering-can.png' },
  { word_kr: '장화', word_vi: 'Ủng', image: '056-rubber-boots.png' },
  { word_kr: '로터리', word_vi: 'Máy phay đất', image: '057-rotary-tiller.png' },
  { word_kr: '멀칭기', word_vi: 'Máy phủ màng nilon', image: '058-mulching-machine.png' },
  { word_kr: '볏짚절단기', word_vi: 'Máy cắt rơm rạ', image: '059-straw-cutter.png' },
  { word_kr: '사료배합기', word_vi: 'Máy trộn thức ăn', image: '060-feed-mixer.png' },
  { word_kr: '자동관수기', word_vi: 'Máy tưới nước tự động', image: '061-automatic-irrigator.png' },
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
  const objectPath = `vocab-vong2/agriculture-2026/${item.image}`
  if (!await objectExists(imageBucket, objectPath)) {
    const image = await fs.readFile(path.join(imageDirectory, item.image))
    const { error } = await supabase.storage.from(imageBucket).upload(objectPath, image, {
      contentType: 'image/png', cacheControl: '31536000', upsert: false,
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
  .eq('industry', 'AGRICULTURE')
if (loadError) throw loadError

const existingByWord = new Map((existing || []).map(item => [normalizeKorean(item.word_kr), item]))
const plan = vocabulary.map(item => ({ ...item, existing: existingByWord.get(normalizeKorean(item.word_kr)) || null }))

console.log(JSON.stringify({
  sourceItems: vocabulary.length,
  existingAgriculture: (existing || []).length,
  insertCount: plan.filter(item => !item.existing).length,
  updateCount: plan.filter(item => item.existing).length,
  insert: plan.filter(item => !item.existing).map(item => `${item.word_kr} — ${item.word_vi}`),
}, null, 2))

if (!execute) {
  console.log('Chế độ xem trước; thêm --execute để nhập dữ liệu.')
  process.exit(0)
}

let inserted = 0
let updated = 0
for (const item of plan) {
  const imageUrl = await ensureImage(item)
  const audioUrl = item.existing?.audio_url || await ensureAudio(item.word_kr)
  if (item.existing) {
    const { error } = await supabase.from('vocabulary_vong2').update({
      word_vi: item.word_vi,
      type: 'TOOL',
      image_url: imageUrl,
      audio_url: audioUrl,
    }).eq('id', item.existing.id)
    if (error) throw error
    updated += 1
    console.log(`[update ${updated}] ${item.word_kr} — ${item.word_vi}`)
    continue
  }

  const { error } = await supabase.from('vocabulary_vong2').insert({
    industry: 'AGRICULTURE',
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

console.log(JSON.stringify({ inserted, updated, expectedAgricultureTotal: (existing || []).length + inserted }, null, 2))
