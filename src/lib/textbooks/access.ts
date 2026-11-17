import { createAdminClient } from "@/lib/supabase/admin"
import { workbookEntitlement } from "@/lib/textbooks/workbook-entitlement"
export function textbookPermissionsForRole(role: unknown) {
  const manager = role === "admin" || role === "teacher"
  return { canEditLayout: manager, canManageAnswerKeys: role === "admin", canViewTranscript: manager }
}

export async function getTextbookPermissions(userId: string) {
  const { data } = await createAdminClient().from("profiles").select("role").eq("id", userId).maybeSingle()
  return textbookPermissionsForRole(data?.role)
}

export async function hasWorkbookAccess(userId: string) {
  if ((await getTextbookPermissions(userId)).canEditLayout) return true
  // Read current server metadata so revocation also applies to an existing login session.
  const { data, error } = await createAdminClient().auth.admin.getUserById(userId)
  return !error && workbookEntitlement(data.user?.app_metadata).active
}

export async function canPreviewTextbooks(userId: string) {
  return (await getTextbookPermissions(userId)).canEditLayout
}

export async function canReadTextbook(userId: string, bookId: string) {
  const { data } = await createAdminClient().from("textbooks").select("is_published,code,metadata").eq("id", bookId).maybeSingle()
  if (!data) return false
  if (await canPreviewTextbooks(userId)) return true
  if (data.code?.includes("-workbook-") && data.metadata?.access_mode === "workbook_activation") return data.metadata.activation_enabled !== false && await hasWorkbookAccess(userId)
  return !!data.is_published && (!data.code?.includes("-workbook-") || await hasWorkbookAccess(userId))
}

/** Call only after canReadTextbook; private rows are served through authorized APIs. */
export async function usesPrivateWorkbookAccess(bookId: string) {
  const { data } = await createAdminClient().from("textbooks").select("code,metadata").eq("id", bookId).maybeSingle()
  return !!data?.code?.includes("-workbook-") && data.metadata?.access_mode === "workbook_activation"
}
