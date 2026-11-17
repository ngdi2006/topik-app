import { mkdir, writeFile } from "node:fs/promises"
import dotenv from "dotenv"
import { createClient } from "@supabase/supabase-js"
import { workbookUnits } from "./workbook-toc-data.mjs"

dotenv.config({ path: ".env.local", quiet: true })
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
const upload = process.argv.includes("--upload")
const report = []
function check(result) { if (result.error) throw result.error; return result.data }
for (const volume of [1, 2]) {
  const book = check(await db.from("textbooks").select("id,code,total_pages,is_published,metadata").eq("code", `eps-topik-2025-workbook-${volume}`).single())
  if (book.is_published) throw new Error("Workbook must remain an admin-only draft")
  const previous = check(await db.from("textbook_units").select("*").eq("textbook_id", book.id).order("sort_order"))
  const units = workbookUnits(volume, book.total_pages).map(unit => ({ ...unit, textbook_id: book.id }))
  if (upload) {
    await mkdir("tmp", { recursive: true })
    await writeFile(`tmp/workbook-toc-backup-${volume}-${Date.now()}.json`, JSON.stringify(previous, null, 2))
    // Reuse the old whole-book entry so existing references keep their unit ID.
    const placeholder = previous.find(unit => unit.metadata?.mapping === "whole_book")
    if (placeholder) check(await db.from("textbook_units").update(units.find(unit => unit.unit_number === (volume === 1 ? 1 : 31))).eq("id", placeholder.id))
    check(await db.from("textbook_units").upsert(units, { onConflict: "textbook_id,unit_number" }))
    check(await db.from("textbooks").update({ metadata: { ...book.metadata, unit_mapping: "visually_verified_pdf_headers" }, updated_at: new Date().toISOString() }).eq("id", book.id))
    const saved = check(await db.from("textbook_units").select("unit_number,start_page,end_page,is_published,title_ko,title_vi,sort_order").eq("textbook_id", book.id).order("sort_order"))
    if (JSON.stringify(saved) !== JSON.stringify(units.map(({ unit_number, start_page, end_page, is_published, title_ko, title_vi, sort_order }) => ({ unit_number, start_page, end_page, is_published, title_ko, title_vi, sort_order })))) throw new Error(`TOC verification failed: ${book.code}`)
  }
  report.push({ code: book.code, entries: units.length, pages: book.total_pages, units: units.map(unit => ({ ...unit, href: `/textbooks/${book.id}/read?page=${unit.start_page}` })) })
  console.log(`${book.code}: ${units.length} entries; complete coverage of ${book.total_pages} pages; ${upload ? "saved and verified" : "dry run"}`)
}
await mkdir("reports", { recursive: true })
await writeFile("reports/workbook-toc.json", JSON.stringify({ generatedAt: new Date().toISOString(), mode: upload ? "upload" : "dry-run", books: report }, null, 2))
