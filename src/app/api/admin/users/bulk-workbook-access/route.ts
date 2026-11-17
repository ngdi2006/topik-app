import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getTextbookPermissions } from "@/lib/textbooks/access"
import { applyWorkbookAccess, workbookBulkAccessRequest, type WorkbookAccessResult } from "@/lib/textbooks/workbook-access-admin"

export const maxDuration = 60

export async function POST(request: NextRequest) {
  const { data: { user } } = await (await createClient()).auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!(await getTextbookPermissions(user.id)).canManageAnswerKeys) return NextResponse.json({ error: "Chỉ admin được kích hoạt sách bài tập" }, { status: 403 })
  const parsed = workbookBulkAccessRequest.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Chọn tối đa 100 tài khoản khác nhau, quyển sách và thời hạn hợp lệ" }, { status: 400 })
  const { userIds, ...change } = parsed.data
  const now = Date.now()
  const results: WorkbookAccessResult[] = []
  for (let offset = 0; offset < userIds.length; offset += 5) {
    results.push(...await Promise.all(userIds.slice(offset, offset + 5).map(id => applyWorkbookAccess(id, change, user, now))))
  }
  return NextResponse.json({ results, succeeded: results.filter(result => result.ok).length, failed: results.filter(result => !result.ok).length }, { headers: { "Cache-Control": "private, no-store" } })
}
