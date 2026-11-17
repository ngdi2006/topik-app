export type CampusView = 'follow' | 'overview' | 'seat' | 'focus'

export type CampusRoom = {
  id: string; title: string; kind: 'classroom' | 'exam'; capacity: number
  mode: 'self' | 'live'; teacher_id: string | null; meeting_url: string | null
  exam_id: string | null; phase: 'waiting' | 'teaching' | 'ended'; step: number
  occupied: number; queued: number
  exam_title?: string; exam_description?: string; exam_instructions?: string
}
export type CampusMembership = {
  room_id: string; status: 'admitted' | 'waiting' | 'left'; seat: number | null
  position: number | null
}
export type CampusSnapshot = {
  rooms: CampusRoom[]; memberships: CampusMembership[]
  progress: { room_id: string; score: number; completed_at: string | null }[]
  seats: { room_id: string; seat: number }[]; role: string; userId: string
}

export const LESSON = {
  title: 'Bài 1 · Chào hỏi và giới thiệu',
  steps: ['Nghe giảng', 'Học từ vựng', 'Quiz cuối bài', 'Tổng kết'],
  vocabulary: [
    { korean: '안녕하세요', vietnamese: 'Xin chào', reading: 'annyeonghaseyo' },
    { korean: '감사합니다', vietnamese: 'Cảm ơn', reading: 'gamsahamnida' },
    { korean: '학생', vietnamese: 'Học sinh / học viên', reading: 'haksaeng' },
    { korean: '선생님', vietnamese: 'Giáo viên', reading: 'seonsaengnim' },
  ],
  questions: [
    { prompt: '“Xin chào” trong tiếng Hàn là gì?', options: ['감사합니다', '안녕하세요', '학생'] },
    { prompt: '선생님 có nghĩa là gì?', options: ['Giáo viên', 'Học viên', 'Phòng học'] },
    { prompt: 'Chọn cách nói “Cảm ơn”.', options: ['학생', '안녕하세요', '감사합니다'] },
  ],
} as const

export function safeMeetingUrl(value: unknown): string | null {
  if (value === '' || value === null) return null
  if (typeof value !== 'string' || value.length > 1000) throw new Error('Liên kết phòng họp không hợp lệ.')
  const url = new URL(value)
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Phòng họp phải dùng liên kết HTTPS.')
  return url.toString()
}

export function seatPosition(seat: number, capacity: number): [number, number] {
  const columns = Math.min(6, capacity)
  return [(seat - 1) % columns * 2 - (columns - 1), -3 + Math.floor((seat - 1) / columns) * 1.9]
}
