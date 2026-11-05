import process from 'node:process'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const execute = process.argv.includes('--execute')
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Thiếu cấu hình NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY')
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const SOURCE_DOCUMENT = 'KYNANGGIAOTIEP-NGUNGHIEP.pdf'
const SOURCE_SECTION = 'MỤC 3: 문제해결능력 – Khả năng giải quyết vấn đề'
const INDUSTRY = 'Ngư nghiệp'
const CATEGORY = 'Xử lý tình huống'

const item = (sourceItem, topic, questionText, vietnameseMeaning, answers) => ({
  sourceItem,
  topic,
  questionText,
  vietnameseMeaning,
  answers,
})

const questions = [
  item('3.1', 'Ứng xử và an toàn tại nơi làm việc',
    '일하다가 실수를 하면 어떻게 할 건가요?',
    'Khi đang làm việc mà phạm sai lầm thì bạn sẽ làm như thế nào?',
    [
      '사장님께 바로 보고하고 지시에 따르겠습니다.',
      '사장님께 보고하고 죄송하다고 말씀드린 후, 잘못을 개선하기 위해 노력하겠습니다.',
      '신속하게 사장님께 보고하고 실수를 솔직하게 인정한 후 해결 방안을 찾겠습니다.',
    ]),
  item('3.2', 'Ứng xử và an toàn tại nơi làm việc',
    '일을 하다가 사고가 나면 어떻게 할 건가요?',
    'Nếu đang làm việc mà xảy ra sự cố thì bạn sẽ làm như thế nào?',
    [
      '즉시 작업을 중단하고 사장님께 보고하겠습니다. 다치면 큰 소리로 도움을 요청하겠습니다.',
      '즉시 작업을 중단하고 보고한 뒤, 원인을 파악하고 재발 방지에 힘쓰겠습니다. 다치면 도움을 받을 수 있도록 다른 사람을 부르겠습니다.',
    ]),
  item('3.3', 'Ứng xử và an toàn tại nơi làm việc',
    '몸이 아프면 어떻게 할 건가요?',
    'Nếu bị đau ốm thì bạn sẽ làm như thế nào?',
    [
      '사장님께 많이 아파서 병원에 가고 싶다고 말씀드리겠습니다.',
      '사장님께 몸 상태를 보고하고 허락을 받은 후 병원에 가겠습니다.',
    ]),
  item('3.4', 'Ứng xử và an toàn tại nơi làm việc',
    '사장님이 월급을 제때 주지 않으면 어떻게 할 건가요?',
    'Nếu chủ sử dụng lao động không trả lương đúng hạn thì bạn sẽ làm như thế nào?',
    [
      '먼저 사장님께 제 어려움을 이야기하고 월급 지급을 요청하겠습니다. 3개월이 지난 후에도 체불하면 고용노동부에 가서 상담을 받겠습니다.',
    ]),
  item('3.5', 'Ứng xử và an toàn tại nơi làm việc',
    '사장님이 폭행하거나 때리면 어떻게 할 건가요?',
    'Nếu chủ sử dụng lao động bạo hành hoặc đánh bạn thì bạn sẽ làm như thế nào?',
    [
      '먼저 안전한 곳으로 피하겠습니다. 폭행이 계속되면 고용노동부에 가서 상담을 받겠습니다.',
    ]),
  item('3.6', 'Ứng xử và an toàn tại nơi làm việc',
    '일하다가 불이 나면 어떻게 할 건가요?',
    'Nếu đang làm việc mà xảy ra hỏa hoạn thì bạn sẽ làm như thế nào?',
    [
      '즉시 작업을 중단하고 주변 사람들에게 알린 후, 소화기를 사용하거나 안전한 장소로 대피하겠습니다. 그리고 신속하게 119에 신고하겠습니다.',
    ]),
  item('3.7', 'Ứng xử và an toàn tại nơi làm việc',
    '돈이나 물건을 잃어버리면 어떻게 할 건가요?',
    'Nếu bị mất tiền hoặc đồ vật thì bạn sẽ làm như thế nào?',
    [
      '먼저 주변을 잘 찾아보고, 찾지 못하면 사장님께 말씀드리겠습니다.',
    ]),
  item('3.8', 'Ứng xử và an toàn tại nơi làm việc',
    '날씨가 갑자기 나빠지면 어떻게 할 건가요?',
    'Nếu thời tiết đột nhiên xấu đi thì bạn sẽ làm như thế nào?',
    [
      '안전을 위해 즉시 작업을 중단하고 사장님의 지시에 따르겠습니다.',
    ]),
  item('3.9', 'Sự cố trên tàu và trong lao động',
    '어구나 기계가 고장 나면 어떻게 할 건가요?',
    'Nếu ngư cụ hoặc máy móc bị hỏng thì bạn sẽ làm như thế nào?',
    [
      '간단히 고칠 수 있으면 수리하고 일을 계속하겠습니다. 큰 문제라면 작업을 멈추고 즉시 사장님께 보고하겠습니다.',
    ]),
  item('3.10', 'Sự cố trên tàu và trong lao động',
    '작업 중에 어선이 뒤집히면 어떻게 할 건가요?',
    'Nếu tàu đánh cá bị lật trong lúc làm việc thì bạn sẽ làm như thế nào?',
    [
      '침착함을 유지하고 구명 장비를 사용하겠습니다. 그리고 구조 신호를 보내겠습니다.',
    ]),
  item('3.11', 'Sự cố trên tàu và trong lao động',
    '동료가 다쳤을 때 어떻게 할 건가요?',
    'Khi đồng nghiệp bị thương thì bạn sẽ làm như thế nào?',
    [
      '즉시 작업을 중단하고 응급 조치를 하겠습니다. 그리고 사장님께 보고하겠습니다.',
    ]),
  item('3.12', 'Sự cố nuôi trồng thủy sản',
    '물고기가 갑자기 많이 죽으면 어떻게 할 건가요?',
    'Nếu cá đột nhiên chết hàng loạt thì bạn sẽ làm như thế nào?',
    [
      '바로 사장님께 보고하겠습니다. 그리고 수온, 산소 농도, 염도와 사료를 확인하겠습니다.',
    ]),
  item('3.13', 'Sự cố nuôi trồng thủy sản',
    '수조에 이물질이 많으면 어떻게 할 건가요?',
    'Nếu có nhiều chất bẩn hoặc dị vật trong bể chứa nước thì bạn sẽ làm như thế nào?',
    [
      '규정에 맞게 이물질을 제거하고 수조를 청소하겠습니다.',
    ]),
  item('3.14', 'Sự cố nuôi trồng thủy sản',
    '사료의 유통 기한이 지나면 어떻게 할 건가요?',
    'Nếu thức ăn đã hết hạn sử dụng thì bạn sẽ làm như thế nào?',
    [
      '유통 기한이 지난 사료는 사용하지 않고 새 사료로 바꾸겠습니다.',
    ]),
  item('3.15', 'Sự cố nuôi trồng thủy sản',
    '산소 농도가 낮으면 어떻게 할 건가요?',
    'Nếu nồng độ ô-xy thấp thì bạn sẽ làm như thế nào?',
    [
      '산소 공급기를 확인하고 산소 농도를 적당히 조절하겠습니다.',
    ]),
  item('3.16', 'Sự cố nuôi trồng thủy sản',
    '수조의 수온이 높으면 어떻게 할 건가요?',
    'Nếu nhiệt độ nước trong bể quá cao thì bạn sẽ làm như thế nào?',
    [
      '수온을 확인하고 적정 온도로 조절하겠습니다.',
    ]),
  item('3.17', 'Sự cố nuôi trồng thủy sản',
    '펌프에 문제가 발견되면 어떻게 할 건가요?',
    'Nếu phát hiện máy bơm có vấn đề thì bạn sẽ làm như thế nào?',
    [
      '즉시 사장님께 보고하고 수리를 맡기겠습니다.',
    ]),
  item('3.18', 'Sự cố nuôi trồng thủy sản',
    '물 색깔이 갑자기 변하면 어떻게 할 건가요?',
    'Nếu màu nước đột nhiên thay đổi thì bạn sẽ làm như thế nào?',
    [
      '수온, 산소량, 염도 등을 확인하겠습니다. 해결하지 못하면 바로 사장님께 보고하겠습니다.',
    ]),
  item('3.19', 'Sự cố nuôi trồng thủy sản',
    '비가 많이 와서 수조 물이 넘치면 어떻게 할 건가요?',
    'Nếu mưa lớn làm nước trong bể tràn ra thì bạn sẽ làm như thế nào?',
    [
      '규정에 따라 배수 장치를 열고 바로 사장님께 보고하겠습니다.',
    ]),
  item('3.20', 'Sự cố nuôi trồng thủy sản',
    '양식장에서 전기가 나가면 어떻게 할 건가요?',
    'Nếu mất điện ở trại nuôi thủy sản thì bạn sẽ làm như thế nào?',
    [
      '사장님께 보고하고 예비 발전기가 있으면 바로 사용하겠습니다.',
    ]),
]

const normalize = value => String(value || '').normalize('NFC').replace(/\s+/g, ' ').trim()

const { data: existing = [], error: existingError } = await supabase
  .from('interview_questions')
  .select('id,question_text,order_index,tool_config')
  .eq('industry', INDUSTRY)
  .eq('category', CATEGORY)

if (existingError) throw existingError

const { data: highestOrder = [], error: orderError } = await supabase
  .from('interview_questions')
  .select('order_index')
  .order('order_index', { ascending: false, nullsFirst: false })
  .limit(1)

if (orderError) throw orderError

const bySourceItem = new Map(existing
  .filter(row => row.tool_config?.source_document === SOURCE_DOCUMENT && row.tool_config?.source_item)
  .map(row => [String(row.tool_config.source_item), row]))
const byQuestion = new Map(existing.map(row => [normalize(row.question_text), row]))
let nextOrder = Number(highestOrder[0]?.order_index || 0) + 1

const changes = questions.map(question => {
  const current = bySourceItem.get(question.sourceItem) || byQuestion.get(normalize(question.questionText))
  const payload = {
    industry: INDUSTRY,
    category: CATEGORY,
    question_text: question.questionText,
    vietnamese_meaning: question.vietnameseMeaning,
    suggested_answers: [...question.answers, `__topic__:${question.topic}`],
    countdown_after_audio: 20,
    order_index: current?.order_index ?? nextOrder++,
    tool_config: {
      ...(current?.tool_config || {}),
      schema_version: 1,
      source_document: SOURCE_DOCUMENT,
      source_section: SOURCE_SECTION,
      source_item: question.sourceItem,
      topic: question.topic,
      reviewed_language: true,
    },
  }
  return { current, payload, sourceItem: question.sourceItem, topic: question.topic }
})

const groupCounts = Object.entries(changes.reduce((counts, change) => {
  counts[change.topic] = (counts[change.topic] || 0) + 1
  return counts
}, {}))

console.log(`Nguồn: ${SOURCE_DOCUMENT}`)
console.log(`Phạm vi: ${SOURCE_SECTION}`)
console.log(`Tìm thấy hiện tại: ${existing.length} câu ${CATEGORY} / ${INDUSTRY}`)
console.table(groupCounts.map(([topic, count]) => ({ Nhóm: topic, 'Số câu': count })))
console.log(`Kế hoạch: ${changes.filter(change => change.current).length} cập nhật, ${changes.filter(change => !change.current).length} thêm mới`)

if (!execute) {
  console.log('Chế độ kiểm tra. Chạy lại với --execute để nạp dữ liệu.')
  process.exit(0)
}

for (const change of changes) {
  const query = change.current
    ? supabase.from('interview_questions').update(change.payload).eq('id', change.current.id)
    : supabase.from('interview_questions').insert(change.payload)
  const { error } = await query
  if (error) throw new Error(`Không thể nạp mục ${change.sourceItem}: ${error.message}`)
}

const { data: verified = [], error: verifyError } = await supabase
  .from('interview_questions')
  .select('id,question_text,vietnamese_meaning,suggested_answers,tool_config')
  .eq('industry', INDUSTRY)
  .eq('category', CATEGORY)
  .eq('tool_config->>source_document', SOURCE_DOCUMENT)

if (verifyError) throw verifyError

const missingItems = questions
  .filter(question => !verified.some(row => String(row.tool_config?.source_item) === question.sourceItem))
  .map(question => question.sourceItem)
const invalidRows = verified.filter(row => (
  !normalize(row.question_text)
  || !normalize(row.vietnamese_meaning)
  || !Array.isArray(row.suggested_answers)
  || row.suggested_answers.filter(answer => !String(answer).startsWith('__topic__:')).length === 0
))

if (verified.length !== questions.length || missingItems.length || invalidRows.length) {
  throw new Error(`Xác minh thất bại: ${verified.length}/${questions.length} câu; thiếu [${missingItems.join(', ')}]; không hợp lệ ${invalidRows.length}`)
}

console.log(`Đã xác minh thành công ${verified.length}/${questions.length} câu, đủ tiếng Hàn, tiếng Việt và gợi ý trả lời.`)
