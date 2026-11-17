import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getTextbookPermissions } from "@/lib/textbooks/access"
import { recordAdminUserActivity } from "@/lib/admin-user-audit"
import { nextWorkbookExpiry, workbookEntitlement } from "@/lib/textbooks/workbook-entitlement"

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { data: { user } } = await (await createClient()).auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!(await getTextbookPermissions(user.id)).canManageAnswerKeys) return NextResponse.json({ error: "Chỉ admin được kích hoạt sách bài tập" }, { status: 403 })
  const { id } = await context.params
  const parsed = z.discriminatedUnion("action", [z.object({ action: z.literal("extend"), days: z.number().int().min(1).max(3650) }), z.object({ action: z.literal("set_expiry"), expires_at: z.string().datetime({ offset: true }) }), z.object({ action: z.literal("revoke") })]).safeParse(await request.json().catch(() => null))
  if (!z.string().uuid().safeParse(id).success || !parsed.success) return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 })
  const db = createAdminClient()
  const target = await db.auth.admin.getUserById(id)
  if (target.error || !target.data.user) return NextResponse.json({ error: "Không tìm thấy tài khoản" }, { status: 404 })
  const permissions = await getTextbookPermissions(id)
  if (permissions.canEditLayout) return NextResponse.json({ error: "Admin và giáo viên đã có quyền mặc định" }, { status: 400 })
  let next: ReturnType<typeof nextWorkbookExpiry>
  try { next = nextWorkbookExpiry(target.data.user.app_metadata, parsed.data) }
  catch (cause) { return NextResponse.json({ error: cause instanceof Error ? cause.message : "Ngày hết hạn không hợp lệ" }, { status: 400 }) }
  const previousExpiresAt = workbookEntitlement(target.data.user.app_metadata).expiresAt
  const metadata = { ...target.data.user.app_metadata, workbook_access: next.enabled, workbook_access_expires_at: next.expiresAt }
  const result = await db.auth.admin.updateUserById(id, { app_metadata: metadata })
  if (result.error) return NextResponse.json({ error: "Chưa cập nhật được quyền sách bài tập" }, { status: 500 })
  await recordAdminUserActivity({ targetUserId: id, actor: user, actorRole: "admin", action: `workbook_access_${parsed.data.action}`, label: next.enabled ? "Cập nhật thời hạn sách bài tập EPS" : "Tắt quyền sách bài tập EPS", details: { ...parsed.data, previousExpiresAt, expiresAt: next.expiresAt } })
  return NextResponse.json({ ok: true, workbookAccess: workbookEntitlement(metadata).active, workbookAccessExpiresAt: next.expiresAt }, { headers: { "Cache-Control": "private, no-store" } })
}
