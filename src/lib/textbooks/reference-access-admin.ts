import { z } from 'zod'
import type { User } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { recordAdminUserActivity } from '@/lib/admin-user-audit'
import { referenceBookCodes } from './catalog'
import { referenceAccess, updateReferenceAccess, type ReferenceAccess } from './reference-entitlement'
import { updateWorkbookVolumes, workbookEntitlement, workbookVolumeAccess, type WorkbookVolumeAccess } from './workbook-entitlement'
export const managedBookCodes = ['eps-topik-2025-workbook-1', 'eps-topik-2025-workbook-2', ...referenceBookCodes] as const
const books = z.array(z.enum(managedBookCodes)).min(1).max(7).refine(values => new Set(values).size === values.length)
export const referenceAccessRequest = z.discriminatedUnion('action', [
  z.object({ books, action: z.literal('extend'), days: z.number().int().min(1).max(3650) }),
  z.object({ books, action: z.literal('set_expiry'), expires_at: z.string().datetime({ offset: true }).refine(value => Date.parse(value) > Date.now()) }),
  z.object({ books, action: z.literal('revoke') }),
])
export const referenceBulkAccessRequest = z.object({ userIds: z.array(z.string().uuid()).min(1).max(100).refine(ids => new Set(ids).size === ids.length) }).and(referenceAccessRequest)
export type ReferenceAccessUpdate = { userId: string; referenceBooks: ReferenceAccess; workbookVolumes: WorkbookVolumeAccess; workbookAccess: boolean; workbookAccessExpiresAt: string | null }
export type ReferenceAccessResult = ({ ok: true } & ReferenceAccessUpdate) | { ok: false; userId: string; error: string; status: number }
export async function applyReferenceAccess(userId: string, change: z.infer<typeof referenceAccessRequest>, actor: User, now = Date.now()): Promise<ReferenceAccessResult> {
  const db = createAdminClient()
  try {
    const [target, profile] = await Promise.all([db.auth.admin.getUserById(userId), db.from('profiles').select('role').eq('id', userId).maybeSingle()])
    if (target.error || !target.data.user) return { ok: false, userId, error: 'Không tìm thấy tài khoản', status: 404 }
    if (profile.error || !profile.data) return { ok: false, userId, error: 'Không xác định được vai trò', status: 400 }
    if (['admin', 'teacher'].includes(profile.data.role)) return { ok: false, userId, error: 'Admin và giáo viên đã có quyền mặc định', status: 400 }
    const previous = referenceAccess(target.data.user.app_metadata, now)
    const volumes = change.books.flatMap(book => book === 'eps-topik-2025-workbook-1' ? [1 as const] : book === 'eps-topik-2025-workbook-2' ? [2 as const] : [])
    const references = change.books.filter((book): book is typeof referenceBookCodes[number] => referenceBookCodes.some(code => code === book))
    const base = target.data.user.app_metadata
    const metadata = updateReferenceAccess(volumes.length ? updateWorkbookVolumes(base, volumes, change, now) : base, references, change, now)
    const saved = await db.auth.admin.updateUserById(userId, { app_metadata: metadata })
    if (saved.error) return { ok: false, userId, error: 'Chưa cập nhật được quyền tài liệu', status: 500 }
    try { await recordAdminUserActivity({ targetUserId: userId, actor, actorRole: 'admin', action: `reference_access_${change.action}`, label: `${change.action === 'revoke' ? 'Thu hồi' : 'Cập nhật'} quyền sách và tài liệu`, details: { ...change, previousBooks: previous, previousWorkbookVolumes: workbookVolumeAccess(base, now), referenceBooks: referenceAccess(metadata, now), workbookVolumes: workbookVolumeAccess(metadata, now) } }) } catch { console.error('Reference access saved; audit unavailable', userId) }
    const summary = workbookEntitlement(metadata, now)
    return { ok: true, userId, referenceBooks: referenceAccess(metadata, now), workbookVolumes: workbookVolumeAccess(metadata, now), workbookAccess: summary.active, workbookAccessExpiresAt: summary.expiresAt }
  } catch { return { ok: false, userId, error: 'Chưa cập nhật được quyền, hãy kiểm tra lại', status: 500 } }
}
