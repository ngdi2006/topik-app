import { referenceBookCodes } from './catalog'
import type { WorkbookAccessAction } from './workbook-entitlement'
export type ReferenceBookCode = typeof referenceBookCodes[number]
export type ReferenceAccess = Record<ReferenceBookCode, { active: boolean; expiresAt: string | null }>
export const referenceLabels: Record<ReferenceBookCode, string> = {
  'eps-topik-2025-vocabulary-1': 'Từ vựng quyển 1', 'eps-topik-2025-vocabulary-2': 'Từ vựng quyển 2',
  'eps-topik-2025-culture-1': 'Thông tin văn hóa quyển 1', 'eps-topik-2025-culture-2': 'Thông tin văn hóa quyển 2',
  'eps-topik-2025-grammar-1': 'Ngữ pháp tổng hợp',
}
export function referenceEntitlement(metadata: Record<string, unknown> | null | undefined, code: ReferenceBookCode, now = Date.now()) {
  const map = metadata?.reference_book_access
  const entry = map && typeof map === 'object' && !Array.isArray(map) ? (map as Record<string, unknown>)[code] : null
  const value = entry && typeof entry === 'object' ? entry as Record<string, unknown> : null
  const expiry = typeof value?.expires_at === 'string' ? Date.parse(value.expires_at) : NaN
  return { active: value?.enabled === true && Number.isFinite(expiry) && expiry > now, expiresAt: Number.isFinite(expiry) ? new Date(expiry).toISOString() : null }
}
export function referenceAccess(metadata: Record<string, unknown> | null | undefined, now = Date.now()): ReferenceAccess {
  return Object.fromEntries(referenceBookCodes.map(code => [code, referenceEntitlement(metadata, code, now)])) as ReferenceAccess
}
export function updateReferenceAccess(metadata: Record<string, unknown>, books: ReferenceBookCode[], action: WorkbookAccessAction, now = Date.now()) {
  const previous = metadata.reference_book_access
  const entries: Record<string, unknown> = previous && typeof previous === 'object' && !Array.isArray(previous) ? { ...previous } : {}
  for (const book of books) {
    const current = referenceEntitlement(metadata, book, now)
    let expiresAt = current.expiresAt
    if (action.action === 'extend') {
      if (!Number.isInteger(action.days) || action.days < 1 || action.days > 3650) throw new Error('Số ngày không hợp lệ')
      expiresAt = new Date((current.active && current.expiresAt ? Date.parse(current.expiresAt) : now) + action.days * 86400000).toISOString()
    } else if (action.action === 'set_expiry') {
      const expiry = Date.parse(action.expires_at)
      if (!Number.isFinite(expiry) || expiry <= now) throw new Error('Ngày hết hạn phải sau thời điểm hiện tại')
      expiresAt = new Date(expiry).toISOString()
    }
    entries[book] = { enabled: action.action !== 'revoke', expires_at: expiresAt }
  }
  return { ...metadata, reference_book_access: entries }
}
