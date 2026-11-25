import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { userAccessManagementRole } from '@/lib/user-access-management'
import { applyReferenceAccess, referenceBulkAccessRequest, type ReferenceAccessResult } from '@/lib/textbooks/reference-access-admin'
export const maxDuration = 60
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const actorRole = await userAccessManagementRole(supabase, user)
  if (!actorRole) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const parsed = referenceBulkAccessRequest.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Chọn tối đa 100 tài khoản, tài liệu và thời hạn hợp lệ' }, { status: 400 })
  const { userIds, ...change } = parsed.data
  const now = Date.now(), results: ReferenceAccessResult[] = []
  for (let offset = 0; offset < userIds.length; offset += 5) results.push(...await Promise.all(userIds.slice(offset, offset + 5).map(id => applyReferenceAccess(id, change, user, now, actorRole))))
  return NextResponse.json({ results, succeeded: results.filter(r => r.ok).length, failed: results.filter(r => !r.ok).length }, { headers: { 'Cache-Control': 'private, no-store' } })
}
