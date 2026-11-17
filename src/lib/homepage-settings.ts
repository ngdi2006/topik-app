import { createAdminClient } from "@/lib/supabase/admin"

export type HomepageVariant = "eps" | "round-two"
export const HOMEPAGE_BUCKET = "site-settings"
export const HOMEPAGE_FILE = "homepage.json"

export function parseHomepageVariant(value: unknown): HomepageVariant {
  return value === "round-two" ? "round-two" : "eps"
}

// A private configuration object avoids a database schema change. Public
// visitors only receive the selected page, never a storage URL or credentials.
export async function getHomepageVariant(): Promise<HomepageVariant> {
  try {
    const { data, error } = await createAdminClient().storage.from(HOMEPAGE_BUCKET).download(HOMEPAGE_FILE)
    if (error || !data) return "eps"
    const saved = JSON.parse(await data.text())
    return parseHomepageVariant(saved.variant)
  } catch { return "eps" }
}
