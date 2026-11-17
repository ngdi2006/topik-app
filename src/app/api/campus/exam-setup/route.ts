import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTrustedUserRole } from '@/lib/admin-role'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Vui lòng đăng nhập.' }, { status: 401 })
  if (await getTrustedUserRole(user, supabase) !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const params = new URL(request.url).searchParams
  const roomId = params.get('roomId') || ''
  if (!/^[0-9a-f-]{36}$/i.test(roomId)) return NextResponse.json({ error: 'Phòng không hợp lệ.' }, { status: 400 })
  const { data, error } = await supabase.rpc('campus_exam_options', { p_room: roomId, p_search: (params.get('search') || '').slice(0, 120) })
  if (error) return NextResponse.json({ error: error.code === 'P0001' ? error.message : 'Chưa tải được đề thi. Kiểm tra migration nội dung phòng thi.' }, { status: error.code === 'P0001' ? 403 : 503 })
  return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
}
