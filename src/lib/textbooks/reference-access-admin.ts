import { z } from 'zod'
import type { User } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { recordAdminUserActivity } from '@/lib/admin-user-audit'
import { referenceBookCodes } from './catalog'
import { referenceAccess, referenceLabels, updateReferenceAccess, type ReferenceAccess } from './reference-entitlement'
const books = z.array(z.enum(referenceBookCodes)).min(1).max(5).refine(values => new Set(values).size === values.length)
export const referenceAccessRequest = z.discriminatedUnion('action', [
  z.object({ books, action: z.literal('extend'), days: z.number().int().min(1).max(3650) }),
  z.object({ books, action: z.literal('set_expiry'), expires_at: z.string().datetime({ offset: true }).refine(value => Date.parse(value) > Date.now()) }),
  z.object({ books, action: z.literal('revoke') }),
])
export const referenceBulkAccessRequest = z.object({ userIds: z.array(z.string().uuid()).min(1).max(100).refine(ids => new Set(ids).size === ids.length) }).and(referenceAccessRequest)
export type ReferenceAccessUpdate = { userId: string; referenceBooks: ReferenceAccess }
export type ReferenceAccessResult = ({ ok: true } & ReferenceAccessUpdate) | { ok: false; userId: string; error: string; status: number }
export async function applyReferenceAccess(userId: string, change: z.infer<typeof referenceAccessRequest>, actor: User, now = Date.now()): Promise<ReferenceAccessResult> {
  const db = createAdminClient()
  try {
    const [target, profile] = await Promise.all([db.auth.admin.getUserById(userId), db.from('profiles').select('role').eq('id', userId).maybeSingle()])
    if (target.error || !target.data.user) return { ok: false, userId, error: 'Không tìm thấy tài khoản', status: 404 }
    if (profile.error || !profile.data) return { ok: false, userId, error: 'Không xác định được vai trò', status: 400 }
    if (['admin', 'teacher'].includes(profile.data.role)) return { ok: false, userId, error: 'Admin và giáo viên đã có quyền mặc định', status: 400 }
    const previous = referenceAccess(target.data.user.app_metadata, now)
    const metadata = updateReferenceAccess(target.data.user.app_metadata, change.books, change, now)
    const saved = await db.auth.admin.updateUserById(userId, { app_metadata: metadata })
    if (saved.error) return { ok: false, userId, error: 'Chưa cập nhật được quyền tài liệu', status: 500 }
    try { await recordAdminUserActivity({ targetUserId: userId, actor, actorRole: 'admin', action: `reference_access_${change.action}`, label: `${change.action === 'revoke' ? 'Thu hồi' : 'Cập nhật'} quyền: ${change.books.map(book => referenceLabels[book]).join(', ')}`, details: { ...change, previousBooks: previous, referenceBooks: referenceAccess(metadata, now) } }) } catch { console.error('Reference access saved; audit unavailable', userId) }
    return { ok: true, userId, referenceBooks: referenceAccess(metadata, now) }
  } catch { return { ok: false, userId, error: 'Chưa cập nhật được quyền, hãy kiểm tra lại', status: 500 } }
}
