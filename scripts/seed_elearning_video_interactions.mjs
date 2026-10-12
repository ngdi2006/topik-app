import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseUrl || !serviceRoleKey) throw new Error('Thiếu cấu hình Supabase trong .env.local')

const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
const { data: course, error: courseError } = await supabase.from('elearning_courses').select('id').eq('slug', 'giao-trinh-quyen-1').single()
if (courseError) throw courseError
const { data: lesson, error: lessonError } = await supabase.from('elearning_lessons').select('id').eq('course_id', course.id).eq('lesson_number', 1).single()
if (lessonError) throw lessonError
const { data: step, error: stepError } = await supabase.from('elearning_steps').select('id').eq('lesson_id', lesson.id).eq('step_type', 'video').single()
if (stepError) throw stepError

const interactions = [
  {
    step_id: step.id, timestamp_seconds: 20, interaction_type: 'info', title: 'Ghi nhớ nguyên âm ㅓ',
    prompt: 'Nguyên âm ㅓ được phát âm với miệng mở tự nhiên, lưỡi hạ thấp. Hãy quan sát khẩu hình của giáo viên và đọc lại ba lần.',
    options: [], correct_answer: null, explanation: 'Quan sát khẩu hình trước khi luyện đọc giúp phát âm ổn định hơn.', is_required: true, points: 0, sort_order: 1, is_published: true,
  },
  {
    step_id: step.id, timestamp_seconds: 55, interaction_type: 'true_false', title: 'Kiểm tra nhanh',
    prompt: 'Âm ㅓ và âm ㅗ có cùng khẩu hình và cách phát âm.',
    options: ['Đúng', 'Sai'], correct_answer: 'Sai', explanation: 'ㅓ và ㅗ là hai nguyên âm khác nhau. Khi phát âm ㅗ, môi tròn hơn; với ㅓ, miệng mở tự nhiên hơn.', is_required: true, points: 1, sort_order: 2, is_published: true,
  },
  {
    step_id: step.id, timestamp_seconds: 95, interaction_type: 'single_choice', title: 'Chọn nguyên âm đúng',
    prompt: 'Ký tự nào là nguyên âm đang được giáo viên hướng dẫn trong video?',
    options: ['ㅏ', 'ㅓ', 'ㅗ', 'ㅜ'], correct_answer: 'ㅓ', explanation: 'Đáp án đúng là ㅓ. Hãy đọc lại theo khẩu hình trong video.', is_required: true, points: 1, sort_order: 3, is_published: true,
  },
]

const saved = []
for (const interaction of interactions) {
  const { data: existing, error: findError } = await supabase.from('elearning_video_interactions').select('id').eq('step_id', interaction.step_id).eq('timestamp_seconds', interaction.timestamp_seconds).eq('title', interaction.title).maybeSingle()
  if (findError) throw findError
  const query = existing
    ? supabase.from('elearning_video_interactions').update(interaction).eq('id', existing.id)
    : supabase.from('elearning_video_interactions').insert(interaction)
  const { data, error } = await query.select('id,title,timestamp_seconds').single()
  if (error) throw error
  saved.push(data)
}
console.log(`Đã tạo/cập nhật ${saved.length} tương tác mẫu cho Video bài giảng - Bài 1.`)
