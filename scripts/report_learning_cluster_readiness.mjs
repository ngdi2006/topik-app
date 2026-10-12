import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const releaseState = process.env.NEXT_PUBLIC_LEARNING_CLUSTER_RELEASE_STATE === 'released'
  ? 'released'
  : 'development'
const generatedAt = new Date().toISOString()
const protectedPrefixes = ['/elearning', '/textbooks', '/api/elearning', '/api/textbooks']
const requiredFiles = [
  'src/middleware.ts',
  'src/lib/learner-feature-flags.ts',
  'src/app/admin/elearning/page.tsx',
  'src/app/admin/textbooks/page.tsx',
  'src/app/(learner)/elearning/page.tsx',
  'src/app/(learner)/textbooks/page.tsx',
]

async function inspectSource() {
  const middleware = await readFile('src/middleware.ts', 'utf8')
  const flags = await readFile('src/lib/learner-feature-flags.ts', 'utf8')
  return {
    requiredFiles: requiredFiles.map(path => ({ path, exists: existsSync(path) })),
    middlewareUsesLearningGuard: middleware.includes('isLockedLearningPath'),
    defaultsToDevelopment: flags.includes("? 'released'") && flags.includes(": 'development'"),
    protectedPrefixes,
  }
}

async function inspectDatabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return { available: false, reason: 'Thiếu biến môi trường Supabase.' }

  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const [courseResult, textbooksResult, unitsResult] = await Promise.all([
    supabase.from('elearning_courses').select('id,title,is_published,elearning_lessons(id,title,is_published,elearning_steps(id,step_type,title,is_published,youtube_url,content))'),
    supabase.from('textbooks').select('id,title_vi,is_published', { count: 'exact' }),
    supabase.from('textbook_units').select('id,is_published', { count: 'exact' }),
  ])

  const errors = [courseResult.error, textbooksResult.error, unitsResult.error].filter(Boolean).map(error => error.message)
  const courses = courseResult.data || []
  const lessons = courses.flatMap(course => course.elearning_lessons || [])
  const steps = lessons.flatMap(lesson => lesson.elearning_steps || [])
  const videoSteps = steps.filter(step => step.step_type === 'video' || step.step_type === 'culture_video')
  const missingVideo = videoSteps.filter(step => !step.youtube_url).map(step => step.title)
  const missingContent = steps.filter(step => {
    const body = step.content && typeof step.content === 'object' ? step.content.body : ''
    return !body && !step.youtube_url
  }).map(step => step.title)

  return {
    available: errors.length === 0,
    errors,
    elearning: {
      courses: courses.length,
      publishedCourses: courses.filter(item => item.is_published).length,
      lessons: lessons.length,
      publishedLessons: lessons.filter(item => item.is_published).length,
      steps: steps.length,
      publishedSteps: steps.filter(item => item.is_published).length,
      videoSteps: videoSteps.length,
      missingVideo,
      missingContent,
    },
    textbooks: {
      books: textbooksResult.count ?? textbooksResult.data?.length ?? 0,
      publishedBooks: (textbooksResult.data || []).filter(item => item.is_published).length,
      units: unitsResult.count ?? unitsResult.data?.length ?? 0,
      publishedUnits: (unitsResult.data || []).filter(item => item.is_published).length,
    },
  }
}

function markdown(report) {
  const db = report.database
  const missingFiles = report.source.requiredFiles.filter(item => !item.exists)
  const lines = [
    '# Báo cáo sẵn sàng cụm học tập',
    '',
    `- Thời điểm: ${report.generatedAt}`,
    `- Trạng thái phát hành: **${report.releaseState}**`,
    `- Kết luận: **${report.verdict}**`,
    '- Phạm vi: E-Learning, Giáo trình 2025, Học từ vựng và Ngữ pháp.',
    '- Đây là báo cáo cục bộ; lệnh này không deploy và không sửa dữ liệu Supabase.',
    '',
    '## Kiểm soát truy cập',
    '',
    `- Middleware có guard: ${report.source.middlewareUsesLearningGuard ? 'Đạt' : 'Không đạt'}`,
    `- Mặc định fail-closed: ${report.source.defaultsToDevelopment ? 'Đạt' : 'Không đạt'}`,
    `- Route được bảo vệ: ${report.source.protectedPrefixes.join(', ')}`,
    `- File bắt buộc còn thiếu: ${missingFiles.length ? missingFiles.map(item => item.path).join(', ') : 'Không có'}`,
    '',
    '## Dữ liệu nội dung',
    '',
  ]

  if (!db.available) {
    lines.push(`- Không đọc được Supabase: ${(db.errors || [db.reason]).join('; ')}`)
  } else {
    lines.push(
      `- E-Learning: ${db.elearning.courses} khóa, ${db.elearning.lessons} bài, ${db.elearning.steps} bước.`,
      `- Nội dung đang publish: ${db.elearning.publishedCourses} khóa, ${db.elearning.publishedLessons} bài, ${db.elearning.publishedSteps} bước.`,
      `- Video còn thiếu đường dẫn: ${db.elearning.missingVideo.length}.`,
      `- Bước còn thiếu nội dung: ${db.elearning.missingContent.length}.`,
      `- Giáo trình: ${db.textbooks.books} sách (${db.textbooks.publishedBooks} publish), ${db.textbooks.units} bài (${db.textbooks.publishedUnits} publish).`,
    )
  }

  lines.push('', '## Cổng phát hành', '', releaseState === 'released'
    ? '- CẢNH BÁO: cấu hình đang là `released`; cần có phê duyệt trước khi deploy.'
    : '- Cụm học tập đang khóa ở `development`; chưa được phép deploy hoặc mở cho học viên.')
  return `${lines.join('\n')}\n`
}

const source = await inspectSource()
const database = await inspectDatabase().catch(error => ({ available: false, errors: [error.message] }))
const sourceReady = source.middlewareUsesLearningGuard && source.defaultsToDevelopment && source.requiredFiles.every(item => item.exists)
const contentReady = database.available
  && database.elearning.missingVideo.length === 0
  && database.elearning.missingContent.length === 0
const verdict = releaseState !== 'released'
  ? 'ĐANG PHÁT TRIỂN — CHƯA ĐƯỢC PHÁT HÀNH'
  : sourceReady && contentReady ? 'SẴN SÀNG CHỜ PHÊ DUYỆT' : 'CHƯA SẴN SÀNG'
const report = { generatedAt, releaseState, verdict, source, database }

await mkdir('reports', { recursive: true })
await Promise.all([
  writeFile('reports/learning-cluster-readiness.json', `${JSON.stringify(report, null, 2)}\n`, 'utf8'),
  writeFile('reports/learning-cluster-readiness.md', markdown(report), 'utf8'),
])

console.log(markdown(report))
