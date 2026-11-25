import { z } from "zod"
import type { User } from "@supabase/supabase-js"
import { createAdminClient } from "@/lib/supabase/admin"
import { recordAdminUserActivity } from "@/lib/admin-user-audit"
import { updateWorkbookVolumes, workbookEntitlement, workbookVolumeAccess, type WorkbookVolumeAccess } from "./workbook-entitlement"

const volumes = z.array(z.union([z.literal(1), z.literal(2)])).min(1).max(2).refine(values => new Set(values).size === values.length)
export const workbookAccessRequest = z.discriminatedUnion("action", [
  z.object({ volumes, action: z.literal("extend"), days: z.number().int().min(1).max(3650) }),
  z.object({ volumes, action: z.literal("set_expiry"), expires_at: z.string().datetime({ offset: true }).refine(value => Date.parse(value) > Date.now(), "Ngày hết hạn phải sau thời điểm hiện tại") }),
  z.object({ volumes, action: z.literal("revoke") }),
])
export const workbookBulkAccessRequest = z.object({ userIds: z.array(z.string().uuid()).min(1).max(100).refine(ids => new Set(ids).size === ids.length) }).and(workbookAccessRequest)
export type WorkbookAccessUpdate = { userId: string; workbookAccess: boolean; workbookAccessExpiresAt: string | null; workbookVolumes: WorkbookVolumeAccess }
export type WorkbookAccessResult = ({ ok: true } & WorkbookAccessUpdate) | { ok: false; userId: string; error: string; status: number }

export async function applyWorkbookAccess(userId: string, change: z.infer<typeof workbookAccessRequest>, actor: User, now = Date.now(), actorRole = 'admin'): Promise<WorkbookAccessResult> {
  const db = createAdminClient()
  try {
    const [target, profile] = await Promise.all([
      db.auth.admin.getUserById(userId),
      db.from("profiles").select("role").eq("id", userId).maybeSingle(),
    ])
    if (target.error || !target.data.user) return { ok: false, userId, error: "Không tìm thấy tài khoản", status: 404 }
    if (profile.error || !profile.data) return { ok: false, userId, error: "Không xác định được vai trò tài khoản", status: 400 }
    if (["admin", "teacher"].includes(profile.data.role)) return { ok: false, userId, error: "Admin và giáo viên đã có quyền mặc định", status: 400 }
    if (actorRole === 'supporter' && profile.data.role !== 'learner') return { ok: false, userId, error: 'Hỗ trợ viên chỉ được cấp quyền cho học viên', status: 403 }
    const previous = workbookVolumeAccess(target.data.user.app_metadata, now)
    const metadata = updateWorkbookVolumes(target.data.user.app_metadata, change.volumes, change, now)
    const result = await db.auth.admin.updateUserById(userId, { app_metadata: metadata })
    if (result.error) return { ok: false, userId, error: "Chưa cập nhật được quyền sách bài tập", status: 500 }
    // Do not ask the client to repeat an extension already saved if auditing fails.
    try {
      await recordAdminUserActivity({ targetUserId: userId, actor, actorRole, action: `workbook_access_${change.action}`, label: `${change.action === "revoke" ? "Tắt quyền" : "Cập nhật thời hạn"} SBT Quyển ${change.volumes.join(", ")}`, details: { ...change, previousVolumes: previous, workbookVolumes: workbookVolumeAccess(metadata, now) } })
    } catch { console.error("Workbook access saved but audit entry could not be recorded", userId) }
    const summary = workbookEntitlement(metadata, now)
    return { ok: true, userId, workbookAccess: summary.active, workbookAccessExpiresAt: summary.expiresAt, workbookVolumes: workbookVolumeAccess(metadata, now) }
  } catch {
    return { ok: false, userId, error: "Chưa cập nhật được quyền tài khoản, vui lòng kiểm tra lại", status: 500 }
  }
}
