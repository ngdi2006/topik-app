import dotenv from "dotenv"
import { createClient } from "@supabase/supabase-js"

dotenv.config({ path: ".env.local" })
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const data = []
let count = 0
for (let start = 0; ; start += 1000) {
  const result = await client.from("textbook_vocabulary")
    .select("unit_id,word_ko,meaning_vi,review_status,is_published", { count: start === 0 ? "exact" : undefined })
    .eq("review_status", "reviewed").eq("is_published", true).range(start, start + 999)
  if (result.error) throw result.error
  if (start === 0) count = result.count ?? 0
  data.push(...(result.data ?? []))
  if ((result.data?.length ?? 0) < 1000) break
}
const counts = new Map()
for (const row of data) counts.set(row.unit_id, (counts.get(row.unit_id) ?? 0) + 1)
console.log(`VISIBLE_WORDS=${count} COVERED_UNITS=${counts.size} EMPTY_MEANINGS=${data.filter((row) => !row.meaning_vi?.trim()).length}`)
