import crypto from 'node:crypto'
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
const audioBucket = process.env.SUPABASE_TTS_BUCKET || 'tts-audio'

if (!supabaseUrl || !serviceRoleKey) throw new Error('Thiếu cấu hình Supabase')
if (execute && !elevenLabsKey) throw new Error('Thiếu ELEVENLABS_API_KEY')

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const toolIds = {
  '서치라이트': 'fishery_searchlight',
  '부자(부표)': 'fishery_buoy',
  '수중펌프': 'fishery_submersible_pump',
  '어선 수조': 'fishery_livewell',
  '용구대': 'fishery_gaff',
  '조개 갈퀴': 'fishery_shell_rake',
  '집어등': 'fishery_attracting_lamp',
  '갈고리': 'fishery_hook',
  '나침반': 'fishery_compass',
  '뜰채': 'fishery_landing_net',
  '바늘대': 'fishery_netting_needle',
  '반두': 'fishery_scoop_net',
  '손수레': 'fishery_handcart',
  '수경(물안경)': 'fishery_goggles',
  '오리발': 'fishery_fins',
  '일륜차': 'fishery_wheelbarrow',
  '통발': 'fishery_trap',
  '차광막': 'fishery_shade_net',
  '닻': 'fishery_anchor',
  '바구니': 'fishery_basket',
  '낚시바늘': 'fishery_fishhook',
  '고압 분사기': 'fishery_pressure_sprayer',
  '양망기': 'fishery_net_hauler',
  '산소 공급기': 'fishery_oxygenator',
  '온도계': 'fishery_thermometer',
  '밧줄': 'fishery_rope',
  '고리': 'fishery_chain_hook',
  '고무통': 'fishery_rubber_tub',
  '쇠사슬': 'fishery_iron_chain',
  '쌀자루(마대)': 'fishery_sack',
  '양식 사료': 'fishery_feed',
  '저울': 'fishery_scale',
  '호스': 'fishery_hose',
  '뜸줄': 'fishery_float_line',
  '발줄': 'fishery_lead_line',
  '선별판': 'fishery_sorting_tray',
  '굴칼': 'fishery_oyster_knife',
  '염도계': 'fishery_salinity_meter',
  '갑판 청소솔': 'fishery_deck_brush',
  '고무장갑': 'fishery_rubber_gloves',
  '방수 앞치마': 'fishery_waterproof_apron',
  '바가지': 'fishery_scoop',
  '투망': 'fishery_cast_net',
  '작업복': 'fishery_work_clothes',
}

const groups = {
  light_water: ['서치라이트', '집어등', '수중펌프', '산소 공급기', '온도계', '염도계'],
  catch: ['용구대', '조개 갈퀴', '갈고리', '뜰채', '바늘대', '반두', '통발', '낚시바늘', '굴칼', '투망'],
  container: ['어선 수조', '손수레', '일륜차', '바구니', '고무통', '쌀자루(마대)', '선별판'],
  wearable: ['수경(물안경)', '오리발', '고무장갑', '방수 앞치마', '작업복'],
  rigging: ['부자(부표)', '차광막', '닻', '밧줄', '고리', '쇠사슬', '호스', '뜸줄', '발줄'],
  machine: ['고압 분사기', '양망기', '산소 공급기', '수중펌프', '저울', '온도계', '염도계'],
  deck: ['갑판 청소솔', '바가지', '고무장갑', '방수 앞치마', '작업복'],
  supplies: ['양식 사료', '쌀자루(마대)', '바구니', '고무통', '선별판'],
}

const q = (source, toolWord, ko, vi, targetId, targetKo, targetVi, actionId, actionKo, actionVi, group) => ({
  source, toolWord, ko, vi, targetId, targetKo, targetVi, actionId, actionKo, actionVi, group,
})

// Các lựa chọn có dấu “/” trong PDF được tách thành câu nguyên tử để mỗi bài
// kéo thả chỉ có đúng một dụng cụ và một đáp án.
const questions = [
  q('1a', '서치라이트', '서치라이트를 가져오세요.', 'Hãy mang đèn LED đến đây.', 'here', '여기', 'đến đây', 'bring', '가져오다', 'mang đến', 'light_water'),
  q('1b', '부자(부표)', '부표를 가져오세요.', 'Hãy mang phao đến đây.', 'here', '여기', 'đến đây', 'bring', '가져오다', 'mang đến', 'rigging'),
  q('1c', '수중펌프', '수중 펌프를 가져오세요.', 'Hãy mang máy bơm chìm đến đây.', 'here', '여기', 'đến đây', 'bring', '가져오다', 'mang đến', 'light_water'),
  q('2a', '서치라이트', '서치라이트를 가져가세요.', 'Hãy mang đèn LED đi.', 'away', '저쪽', 'mang đi', 'take_away', '가져가다', 'mang đi', 'light_water'),
  q('2b', '부자(부표)', '부표를 가져가세요.', 'Hãy mang phao đi.', 'away', '저쪽', 'mang đi', 'take_away', '가져가다', 'mang đi', 'rigging'),
  q('2c', '수중펌프', '수중 펌프를 가져가세요.', 'Hãy mang máy bơm chìm đi.', 'away', '저쪽', 'mang đi', 'take_away', '가져가다', 'mang đi', 'light_water'),
  q('3a', '부자(부표)', '부표를 가져와 표적으로 삼으세요.', 'Mang phao đến và dùng làm dấu mốc.', 'marker', '표적', 'dấu mốc', 'mark', '표적으로 삼다', 'dùng làm dấu mốc', 'rigging'),
  q('3b', '부자(부표)', '부표를 가져와 신호로 사용하세요.', 'Mang phao đến và dùng làm tín hiệu.', 'signal', '신호', 'tín hiệu', 'signal', '신호로 사용하다', 'dùng làm tín hiệu', 'rigging'),
  q('4a', '서치라이트', '서치라이트를 가져와 켜세요.', 'Mang đèn LED đến và bật lên.', 'switch', '전원', 'nguồn điện', 'turn_on', '켜다', 'bật đèn', 'light_water'),
  q('4b', '서치라이트', '서치라이트를 가져와 물건을 찾으세요.', 'Mang đèn LED đến và tìm đồ vật.', 'object', '물건', 'đồ vật', 'search', '찾아내다', 'tìm kiếm', 'light_water'),
  q('5', '수중펌프', '수중 펌프를 가져와 물을 공급하세요.', 'Mang máy bơm chìm đến và bơm nước.', 'water', '물', 'nước', 'pump', '물을 공급하다', 'bơm nước', 'light_water'),
  q('6a', '어선 수조', '어선 수조에 물고기를 넣으세요.', 'Hãy cho cá vào bể chứa nước trên tàu đánh cá.', 'fish', '물고기', 'cá', 'put_into', '넣다', 'cho vào', 'container'),
  q('6b', '어선 수조', '어선 수조에 새우를 넣으세요.', 'Hãy cho tôm vào bể chứa nước trên tàu đánh cá.', 'shrimp', '새우', 'tôm', 'put_into', '넣다', 'cho vào', 'container'),
  q('7', '용구대', '용구대를 가져와 물고기를 끌어올리세요.', 'Mang móc kéo cá đến và kéo cá lên.', 'fish', '물고기', 'cá', 'lift', '끌어올리다', 'kéo lên', 'catch'),
  q('8', '조개 갈퀴', '갈퀴를 가져와 조개를 캐세요.', 'Mang cào sò đến và đào sò.', 'shellfish', '조개', 'sò', 'dig', '캐다', 'đào', 'catch'),
  q('9', '집어등', '집어등을 가져와 켜세요.', 'Mang đèn gom cá đến và bật lên.', 'switch', '전원', 'nguồn điện', 'turn_on', '켜다', 'bật đèn', 'light_water'),
  q('10a', '갈고리', '갈고리를 가져와 큰 물고기를 끌어당기세요.', 'Mang móc đến và kéo cá lớn.', 'fish', '큰 물고기', 'cá lớn', 'pull', '끌어당기다', 'kéo', 'catch'),
  q('10b', '갈고리', '갈고리를 가져와 그물이나 밧줄을 잡아당기세요.', 'Mang móc đến và kéo lưới hoặc dây thừng.', 'net_rope', '그물이나 밧줄', 'lưới hoặc dây thừng', 'pull', '잡아당기다', 'kéo', 'catch'),
  q('11', '나침반', '나침반을 가져와 방향을 확인하세요.', 'Mang la bàn đến và xác định phương hướng.', 'direction', '방향', 'phương hướng', 'check', '확인하다', 'xác định', 'light_water'),
  q('12', '뜰채', '뜰채를 가져와 물고기를 뜨세요.', 'Mang vợt đến và vớt cá.', 'fish', '물고기', 'cá', 'scoop', '뜨다', 'vớt', 'catch'),
  q('13', '바늘대', '바늘대를 가져와 그물을 짜세요.', 'Mang kim đan lưới đến và đan lưới.', 'net', '그물', 'lưới', 'weave', '짜다', 'đan', 'catch'),
  q('14', '반두', '반두를 가져와 물고기나 새우나 게를 잡으세요.', 'Mang vợt xúc đến và bắt cá, tôm hoặc cua.', 'seafood', '물고기·새우·게', 'cá, tôm hoặc cua', 'catch', '잡다', 'bắt', 'catch'),
  q('15', '손수레', '손수레를 가져와 끌어 보세요.', 'Mang xe kéo tay đến và kéo xe.', 'cart', '손수레', 'xe kéo tay', 'pull', '끌다', 'kéo', 'container'),
  q('16', '수경(물안경)', '수경을 가져와 쓰세요.', 'Mang kính bơi đến và đeo vào.', 'body', '얼굴', 'khuôn mặt', 'wear', '쓰다', 'đeo', 'wearable'),
  q('17', '오리발', '오리발을 가져와 신으세요.', 'Mang chân vịt đến và xỏ vào.', 'feet', '발', 'chân', 'wear', '신다', 'xỏ vào', 'wearable'),
  q('18', '일륜차', '일륜차를 가져와 밀고 당기세요.', 'Mang xe rùa đến và đẩy, kéo xe.', 'cart', '일륜차', 'xe rùa', 'push_pull', '밀고 당기다', 'đẩy và kéo', 'container'),
  q('19', '통발', '통발을 가져와 물고기를 잡으세요.', 'Mang đăng bắt cá đến và bắt cá.', 'fish', '물고기', 'cá', 'catch', '잡다', 'bắt', 'catch'),
  q('20', '차광막', '차광막을 가져와 햇빛을 막으세요.', 'Mang tấm chắn nắng đến và che ánh nắng.', 'sunlight', '햇빛', 'ánh nắng', 'block', '막다', 'che chắn', 'rigging'),
  q('21', '닻', '닻을 가져와 배를 멈추게 하세요.', 'Mang mỏ neo đến và làm cho tàu dừng lại.', 'boat', '배', 'tàu', 'stop', '멈추게 하다', 'làm dừng lại', 'rigging'),
  q('22', '바구니', '바구니를 가져와 물고기나 새우나 오징어를 담으세요.', 'Mang giỏ đến và đựng cá, tôm hoặc mực.', 'seafood', '물고기·새우·오징어', 'cá, tôm hoặc mực', 'put_into', '담다', 'đựng vào', 'container'),
  q('23', '낚시바늘', '낚시 바늘을 가져와 물고기를 낚으세요.', 'Mang lưỡi câu đến và câu cá.', 'fish', '물고기', 'cá', 'fish', '낚다', 'câu cá', 'catch'),
  q('24', '고압 분사기', '고압 분사기를 가져와 그물을 세척하세요.', 'Mang máy xịt cao áp đến và rửa sạch lưới.', 'net', '그물', 'lưới', 'wash', '세척하다', 'rửa sạch', 'machine'),
  q('25', '양망기', '양망기로 그물을 끌어올리세요.', 'Dùng máy kéo lưới để kéo lưới lên.', 'net', '그물', 'lưới', 'lift', '끌어올리다', 'kéo lên', 'machine'),
  q('26', '산소 공급기', '산소 공급기로 산소를 공급하세요.', 'Dùng máy cung cấp ôxy để cung cấp ôxy.', 'oxygen', '산소', 'ôxy', 'supply', '공급하다', 'cung cấp', 'machine'),
  q('27', '온도계', '온도계를 가져와 수온을 측정하세요.', 'Mang nhiệt kế đến và đo nhiệt độ nước.', 'water_temperature', '수온', 'nhiệt độ nước', 'measure', '측정하다', 'đo', 'machine'),
  q('28', '밧줄', '밧줄을 가져와 묶으세요.', 'Mang dây thừng đến và buộc lại.', 'object', '물건', 'đồ vật', 'tie', '묶다', 'buộc', 'rigging'),
  q('29a', '고리', '고리를 가져와 그물을 부표에 연결하세요.', 'Mang móc xích đến và nối lưới vào phao.', 'net_buoy', '그물과 부표', 'lưới và phao', 'connect', '연결하다', 'nối', 'rigging'),
  q('29b', '고리', '고리를 가져와 닻줄을 어선에 연결하세요.', 'Mang móc xích đến và nối dây neo với tàu đánh cá.', 'anchor_boat', '닻줄과 어선', 'dây neo và tàu đánh cá', 'connect', '연결하다', 'nối', 'rigging'),
  q('29c', '고리', '고리를 물고기 상자에 연결하세요.', 'Nối móc xích vào thùng cá.', 'fish_box', '물고기 상자', 'thùng cá', 'connect', '연결하다', 'nối', 'rigging'),
  q('30', '고무통', '고무통을 가져와 물고기나 새우를 넣으세요.', 'Mang thùng cao su đến và cho cá hoặc tôm vào.', 'seafood', '물고기나 새우', 'cá hoặc tôm', 'put_into', '넣다', 'cho vào', 'container'),
  q('31', '쇠사슬', '쇠사슬을 가져와 닻과 어선을 연결하세요.', 'Mang xích sắt đến và nối mỏ neo với tàu đánh cá.', 'anchor_boat', '닻과 어선', 'mỏ neo và tàu đánh cá', 'connect', '연결하다', 'nối', 'rigging'),
  q('32', '쌀자루(마대)', '마대를 가져와 어구를 담으세요.', 'Mang bao tải đến và đựng dụng cụ đánh bắt.', 'fishing_gear', '어구', 'dụng cụ đánh bắt', 'put_into', '담다', 'đựng vào', 'supplies'),
  q('33', '양식 사료', '양식 사료를 가져와 물고기나 새우에게 주세요.', 'Mang thức ăn nuôi thủy sản đến và cho cá hoặc tôm ăn.', 'seafood', '물고기나 새우', 'cá hoặc tôm', 'feed', '먹이를 주다', 'cho ăn', 'supplies'),
  q('34', '저울', '저울을 가져와 무게를 재세요.', 'Mang cân đến và cân trọng lượng.', 'weight', '무게', 'trọng lượng', 'weigh', '재다', 'cân', 'machine'),
  q('35', '호스', '호스를 가져와 펌프에 연결하세요.', 'Mang vòi đến và nối vào máy bơm.', 'pump', '펌프', 'máy bơm', 'connect', '연결하다', 'nối', 'rigging'),
  q('36', '뜸줄', '뜸줄을 가져와 물에 띄우세요.', 'Mang dây phao đến và thả nổi trên mặt nước.', 'water', '물', 'nước', 'float', '띄우다', 'thả nổi', 'rigging'),
  q('37', '발줄', '발줄을 가져와 물에 가라앉히세요.', 'Mang dây chì đến và thả chìm xuống nước.', 'water', '물', 'nước', 'sink', '가라앉히다', 'thả chìm', 'rigging'),
  q('38', '선별판', '선별판을 가져와 물고기를 선별하세요.', 'Mang khay phân loại đến và phân loại cá.', 'fish', '물고기', 'cá', 'sort', '선별하다', 'phân loại', 'container'),
  q('39', '굴칼', '굴칼을 가져와 굴을 까세요.', 'Mang dao cạy hàu đến và cạy hàu.', 'oyster', '굴', 'hàu', 'shuck', '까다', 'cạy', 'catch'),
  q('40', '염도계', '염도계를 가져와 바닷물의 염도를 측정하세요.', 'Mang máy đo độ mặn đến và đo độ mặn của nước biển.', 'salinity', '바닷물의 염도', 'độ mặn của nước biển', 'measure', '측정하다', 'đo', 'machine'),
  q('41', '갑판 청소솔', '갑판 청소솔을 가져와 갑판을 청소하세요.', 'Mang chổi vệ sinh boong tàu đến và quét sạch boong tàu.', 'deck', '갑판', 'boong tàu', 'sweep', '청소하다', 'quét sạch', 'deck'),
  q('42', '고무장갑', '고무장갑을 가져와 손에 끼세요.', 'Mang găng tay cao su đến và đeo vào tay.', 'hands', '손', 'tay', 'wear', '끼다', 'đeo', 'wearable'),
  q('43', '방수 앞치마', '방수 앞치마를 가져와 몸에 입으세요.', 'Mang tạp dề chống nước đến và mặc vào người.', 'body', '몸', 'cơ thể', 'wear', '입다', 'mặc', 'wearable'),
  q('44', '바가지', '바가지를 가져와 물을 퍼 담으세요.', 'Mang gáo đến và múc nước.', 'water', '물', 'nước', 'scoop_water', '퍼 담다', 'múc', 'deck'),
  q('45', '투망', '투망을 가져와 바다에 던지세요.', 'Mang lưới quăng đến và quăng xuống biển.', 'sea', '바다', 'biển', 'throw', '던지다', 'quăng', 'catch'),
  q('46', '작업복', '작업복을 가져와 몸에 입으세요.', 'Mang quần áo làm việc đến và mặc vào người.', 'body', '몸', 'cơ thể', 'wear', '입다', 'mặc', 'wearable'),
]

const normalize = value => String(value || '').replace(/\s+/g, '')

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

async function ensureAudio(text) {
  const spokenText = toKoreanPronunciationText(text)
  const objectPath = audioObjectPath(spokenText)
  if (!await objectExists(audioBucket, objectPath)) {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: { 'xi-api-key': elevenLabsKey, 'Content-Type': 'application/json', accept: 'audio/mpeg' },
      body: JSON.stringify({
        text: spokenText,
        model_id: modelId,
        voice_settings: { stability: 0.55, similarity_boost: 0.8, style: 0.15, use_speaker_boost: true },
      }),
      signal: AbortSignal.timeout(45_000),
    })
    if (!response.ok) throw new Error(`ElevenLabs ${response.status}: ${await response.text()}`)
    const audio = Buffer.from(await response.arrayBuffer())
    const { error } = await supabase.storage.from(audioBucket).upload(objectPath, audio, {
      contentType: 'audio/mpeg', cacheControl: '31536000', upsert: false,
    })
    if (error) throw error
  }
  return `${supabaseUrl}/storage/v1/object/public/${audioBucket}/${objectPath}`
}

const { data: vocabulary, error: vocabularyError } = await supabase
  .from('vocabulary_vong2')
  .select('word_kr,word_vi,image_url,audio_url')
  .eq('industry', 'FISHERY')
if (vocabularyError) throw vocabularyError

const vocabularyByWord = new Map(vocabulary.map(item => [normalize(item.word_kr), item]))
for (const word of Object.keys(toolIds)) {
  if (!vocabularyByWord.has(normalize(word))) throw new Error(`Không tìm thấy từ vựng Ngư nghiệp: ${word}`)
}

const { data: existing, error: existingError } = await supabase
  .from('interview_questions')
  .select('id,question_text,order_index,tool_config')
  .eq('industry', 'Ngư nghiệp')
  .eq('category', 'Sử dụng công cụ')
if (existingError) throw existingError

const { data: lastOrderRows, error: orderError } = await supabase
  .from('interview_questions')
  .select('order_index')
  .order('order_index', { ascending: false, nullsFirst: false })
  .limit(1)
if (orderError) throw orderError

const existingByQuestion = new Map((existing || []).map(item => [item.question_text.trim(), item]))
const existingBySourceItem = new Map((existing || [])
  .filter(item => item.tool_config?.source_document === 'SDCC-NGU NGHIEP.pdf' && item.tool_config?.source_item)
  .map(item => [String(item.tool_config.source_item), item]))
const startingOrder = Number(lastOrderRows?.[0]?.order_index || 0) + 1

function optionFor(word) {
  const item = vocabularyByWord.get(normalize(word))
  return { id: toolIds[word], name_ko: item.word_kr, name_vi: item.word_vi, image_url: item.image_url }
}

function buildPayload(item, index, audioUrl) {
  const correctVocabulary = vocabularyByWord.get(normalize(item.toolWord))
  const groupWords = groups[item.group]
  const optionWords = Array.from(new Set([item.toolWord, ...groupWords])).slice(0, 5)
  const options = optionWords.map(optionFor)
  const correctTool = toolIds[item.toolWord]
  const requiresTarget = Boolean(item.targetId)
  const answerSteps = [
    { step: 1, kind: 'tool', expected: correctTool },
    ...(requiresTarget ? [{ step: 2, kind: 'target', expected: item.targetId }] : []),
    { step: requiresTarget ? 3 : 2, kind: 'action', expected: item.actionId },
  ]
  const structuredAnswer = `Công cụ: ${correctVocabulary.word_vi} | Vật thể/vị trí: ${item.targetVi} | Thao tác: ${item.actionVi}`

  return {
    industry: 'Ngư nghiệp',
    category: 'Sử dụng công cụ',
    question_text: item.ko,
    vietnamese_meaning: item.vi,
    question_audio_url: audioUrl,
    suggested_answers: [structuredAnswer, `${correctVocabulary.word_kr}: ${correctVocabulary.word_vi} · ${item.actionKo}: ${item.actionVi}`],
    countdown_after_audio: 8,
    tool_image_url: correctVocabulary.image_url,
    target_zone_id: item.targetId,
    order_index: (existingBySourceItem.get(item.source) || existingByQuestion.get(item.ko))?.order_index ?? startingOrder + index,
    tool_config: {
      schema_version: 4,
      manual_override: true,
      source_document: 'SDCC-NGU NGHIEP.pdf',
      source_item: item.source,
      tools_on_desk: options.map(option => option.id),
      tool_options: options,
      correct_tool: correctTool,
      target_object: item.targetId,
      requires_target: requiresTarget,
      correct_action: item.actionId,
      requires_action: true,
      vocabulary_analysis: [
        { term: correctVocabulary.word_kr, meaning: correctVocabulary.word_vi, role: 'tool', group: item.group },
        { term: item.targetKo, meaning: item.targetVi, role: item.targetId === 'here' || item.targetId === 'away' ? 'location' : 'target' },
        { term: item.actionKo, meaning: item.actionVi, role: 'action' },
      ],
      answer_steps: answerSteps,
      scoring: { tool: 1, target: requiresTarget ? 1 : 0, action: 1, pass_all_required: true },
      vietnamese_instruction: item.vi,
      game_config: {
        schemaVersion: 1,
        type: 'select_tool',
        toolId: correctTool,
        objectId: item.targetId,
        actionId: item.actionId,
        distractorIds: options.filter(option => option.id !== correctTool).map(option => option.id),
      },
    },
  }
}

console.log(JSON.stringify({
  sourceItems: 46,
  atomicQuestions: questions.length,
  existingQuestions: existing.length,
  insertCount: questions.filter(item => !existingBySourceItem.has(item.source) && !existingByQuestion.has(item.ko)).length,
  updateCount: questions.filter(item => existingBySourceItem.has(item.source) || existingByQuestion.has(item.ko)).length,
  groups: Object.fromEntries(Object.entries(groups).map(([name, words]) => [name, words.length])),
}, null, 2))

if (!execute) {
  console.log('Chế độ xem trước; thêm --execute để tạo âm thanh và nhập dữ liệu.')
  process.exit(0)
}

let inserted = 0
let updated = 0
for (const [index, item] of questions.entries()) {
  const audioUrl = await ensureAudio(item.ko)
  const payload = buildPayload(item, index, audioUrl)
  const row = existingBySourceItem.get(item.source) || existingByQuestion.get(item.ko)
  const query = row
    ? supabase.from('interview_questions').update(payload).eq('id', row.id)
    : supabase.from('interview_questions').insert(payload)
  const { error } = await query
  if (error) throw error
  if (row) {
    updated += 1
    console.log(`[update ${updated}] ${item.source} ${item.ko}`)
  } else {
    inserted += 1
    console.log(`[insert ${inserted}] ${item.source} ${item.ko}`)
  }
}

console.log(JSON.stringify({ inserted, updated, total: questions.length }, null, 2))
