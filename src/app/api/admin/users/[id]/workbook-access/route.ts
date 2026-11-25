import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { userAccessManagementRole } from "@/lib/user-access-management"
import { applyWorkbookAccess, workbookAccessRequest } from "@/lib/textbooks/workbook-access-admin"

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const actorRole = await userAccessManagementRole(supabase, user)
  if (!actorRole) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await context.params
  const parsed = workbookAccessRequest.safeParse(await request.json().catch(() => null))
  if (!z.string().uuid().safeParse(id).success || !parsed.success) return NextResponse.json({ error: "Chọn quyển sách và thời hạn hợp lệ" }, { status: 400 })
  const result = await applyWorkbookAccess(id, parsed.data, user, Date.now(), actorRole)
  return NextResponse.json(result.ok ? result : { error: result.error }, { status: result.ok ? 200 : result.status, headers: { "Cache-Control": "private, no-store" } })
}
