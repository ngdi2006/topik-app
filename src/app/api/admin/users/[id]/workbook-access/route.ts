import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { getTextbookPermissions } from "@/lib/textbooks/access"
import { applyWorkbookAccess, workbookAccessRequest } from "@/lib/textbooks/workbook-access-admin"

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { data: { user } } = await (await createClient()).auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!(await getTextbookPermissions(user.id)).canManageAnswerKeys) return NextResponse.json({ error: "Chỉ admin được kích hoạt sách bài tập" }, { status: 403 })
  const { id } = await context.params
  const parsed = workbookAccessRequest.safeParse(await request.json().catch(() => null))
  if (!z.string().uuid().safeParse(id).success || !parsed.success) return NextResponse.json({ error: "Chọn quyển sách và thời hạn hợp lệ" }, { status: 400 })
  const result = await applyWorkbookAccess(id, parsed.data, user)
  return NextResponse.json(result.ok ? result : { error: result.error }, { status: result.ok ? 200 : result.status, headers: { "Cache-Control": "private, no-store" } })
}
