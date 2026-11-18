import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTextbookPermissions } from '@/lib/textbooks/access'
import { applyReferenceAccess, referenceBulkAccessRequest, type ReferenceAccessResult } from '@/lib/textbooks/reference-access-admin'
export const maxDuration = 60
export async function POST(request: NextRequest) {
  const { data: { user } } = await (await createClient()).auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await getTextbookPermissions(user.id)).canManageAnswerKeys) return NextResponse.json({ error: 'Chỉ admin được cấp quyền tài liệu' }, { status: 403 })
  const parsed = referenceBulkAccessRequest.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Chọn tối đa 100 tài khoản, tài liệu và thời hạn hợp lệ' }, { status: 400 })
  const { userIds, ...change } = parsed.data
  const now = Date.now(), results: ReferenceAccessResult[] = []
  for (let offset = 0; offset < userIds.length; offset += 5) results.push(...await Promise.all(userIds.slice(offset, offset + 5).map(id => applyReferenceAccess(id, change, user, now))))
  return NextResponse.json({ results, succeeded: results.filter(r => r.ok).length, failed: results.filter(r => !r.ok).length }, { headers: { 'Cache-Control': 'private, no-store' } })
}
