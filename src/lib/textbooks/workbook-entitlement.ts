export function workbookEntitlement(metadata: Record<string, unknown> | null | undefined, now = Date.now()) {
  const raw = metadata?.workbook_access_expires_at
  const expiry = typeof raw === "string" ? Date.parse(raw) : NaN
  return { active: metadata?.workbook_access === true && Number.isFinite(expiry) && expiry > now, expiresAt: Number.isFinite(expiry) ? new Date(expiry).toISOString() : null }
}

export function nextWorkbookExpiry(metadata: Record<string, unknown>, action: { action: "extend"; days: number } | { action: "set_expiry"; expires_at: string } | { action: "revoke" }, now = Date.now()) {
  if (action.action === "revoke") return { enabled: false, expiresAt: workbookEntitlement(metadata, now).expiresAt }
  if (action.action === "set_expiry") {
    const expiry = Date.parse(action.expires_at)
    if (!Number.isFinite(expiry) || expiry <= now) throw new Error("Ngày hết hạn phải sau thời điểm hiện tại")
    return { enabled: true, expiresAt: new Date(expiry).toISOString() }
  }
  const current = workbookEntitlement(metadata, now)
  const base = current.active && current.expiresAt ? Date.parse(current.expiresAt) : now
  return { enabled: true, expiresAt: new Date(base + action.days * 86400000).toISOString() }
}
