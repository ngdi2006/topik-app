import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { safeMeetingUrl } from '@/lib/campus/model'
import { getTrustedUserRole } from '@/lib/admin-role'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Vui lòng đăng nhập.' }, { status: 401 })
  if (await getTrustedUserRole(user, supabase) !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { data, error } = await supabase.rpc('campus_snapshot')
  if (error) return NextResponse.json({ error: 'Module chưa sẵn sàng. Cần áp dụng migration campus trước khi sử dụng.' }, { status: 503 })
  return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Vui lòng đăng nhập.' }, { status: 401 })
  if (await getTrustedUserRole(user, supabase) !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const body = await request.json()
    if (!body || !/^[0-9a-f-]{36}$/i.test(body.roomId || '') || !['join', 'leave', 'configure', 'teach', 'quiz', 'complete', 'exam_setup'].includes(body.action)) {
      return NextResponse.json({ error: 'Yêu cầu không hợp lệ.' }, { status: 400 })
    }
    const payload = body.data && typeof body.data === 'object' && !Array.isArray(body.data) ? body.data : {}
    if (body.action === 'configure') payload.meeting_url = safeMeetingUrl(payload.meeting_url)
    const { data, error } = body.action === 'exam_setup'
      ? await supabase.rpc('campus_exam_setup', { p_room: body.roomId, p_data: payload })
      : await supabase.rpc('campus_action', { p_room: body.roomId, p_action: body.action, p_data: payload })
    if (error) return NextResponse.json({ error: error.code === 'P0001' ? error.message : 'Không thể thực hiện thao tác. Kiểm tra cấu hình phòng và thử lại.' }, { status: 400 })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Dữ liệu không hợp lệ. Liên kết phòng họp phải dùng HTTPS.' }, { status: 400 })
  }
}
