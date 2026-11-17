export type WorkbookVolume = 1 | 2
export type WorkbookVolumeAccess = Record<WorkbookVolume, { active: boolean; expiresAt: string | null }>
export type WorkbookAccessAction = { action: "extend"; days: number } | { action: "set_expiry"; expires_at: string } | { action: "revoke" }

export function workbookVolumeFromCode(code: string | null | undefined): WorkbookVolume | null {
  const volume = code?.match(/-workbook-([12])$/)?.[1]
  return volume ? Number(volume) as WorkbookVolume : null
}

export function workbookEntitlement(metadata: Record<string, unknown> | null | undefined, now = Date.now(), volume?: WorkbookVolume): { active: boolean; expiresAt: string | null } {
  if (volume === undefined) {
    const entries = ([1, 2] as const).map(value => workbookEntitlement(metadata, now, value))
    const expiries = entries.filter(entry => entry.active && entry.expiresAt).map(entry => entry.expiresAt as string)
    return { active: entries.some(entry => entry.active), expiresAt: expiries.sort().at(-1) ?? entries.map(entry => entry.expiresAt).filter((value): value is string => !!value).sort().at(-1) ?? null }
  }
  const volumes = metadata?.workbook_access_volumes
  const hasVolumes = metadata != null && Object.prototype.hasOwnProperty.call(metadata, "workbook_access_volumes")
  const entry = typeof volumes === "object" && volumes !== null && !Array.isArray(volumes) ? (volumes as Record<string, unknown>)[String(volume)] : undefined
  const record = typeof entry === "object" && entry !== null ? entry as Record<string, unknown> : null
  // Old timed grants covered both books. Preserve them until the admin edits
  // access, then store an explicit entry for each volume. A malformed new map
  // never falls back to the old shared grant.
  const raw = hasVolumes ? record?.expires_at : metadata?.workbook_access_expires_at
  const expiry = typeof raw === "string" ? Date.parse(raw) : NaN
  const enabled = hasVolumes ? record?.enabled === true : metadata?.workbook_access === true
  return { active: enabled && Number.isFinite(expiry) && expiry > now, expiresAt: Number.isFinite(expiry) ? new Date(expiry).toISOString() : null }
}

export function workbookVolumeAccess(metadata: Record<string, unknown> | null | undefined, now = Date.now()): WorkbookVolumeAccess {
  return { 1: workbookEntitlement(metadata, now, 1), 2: workbookEntitlement(metadata, now, 2) }
}

export function nextWorkbookExpiry(metadata: Record<string, unknown>, action: WorkbookAccessAction, now = Date.now(), volume?: WorkbookVolume) {
  if (action.action === "revoke") return { enabled: false, expiresAt: workbookEntitlement(metadata, now, volume).expiresAt }
  if (action.action === "set_expiry") {
    const expiry = Date.parse(action.expires_at)
    if (!Number.isFinite(expiry) || expiry <= now) throw new Error("Ngày hết hạn phải sau thời điểm hiện tại")
    return { enabled: true, expiresAt: new Date(expiry).toISOString() }
  }
  if (!Number.isInteger(action.days) || action.days < 1 || action.days > 3650) throw new Error("Số ngày phải từ 1 đến 3650")
  const current = workbookEntitlement(metadata, now, volume)
  const base = current.active && current.expiresAt ? Date.parse(current.expiresAt) : now
  return { enabled: true, expiresAt: new Date(base + action.days * 86400000).toISOString() }
}

export function updateWorkbookVolumes(metadata: Record<string, unknown>, volumes: WorkbookVolume[], action: WorkbookAccessAction, now = Date.now()) {
  const current = workbookVolumeAccess(metadata, now)
  const entries = Object.fromEntries(([1, 2] as const).map(volume => {
    const next = volumes.includes(volume) ? nextWorkbookExpiry(metadata, action, now, volume) : { enabled: current[volume].active, expiresAt: current[volume].expiresAt }
    return [String(volume), { enabled: next.enabled, expires_at: next.expiresAt }]
  }))
  return { ...metadata, workbook_access_volumes: entries }
}
