import { readFile, writeFile, mkdir } from "node:fs/promises"
import { createHash } from "node:crypto"
import dotenv from "dotenv"
import { createClient } from "@supabase/supabase-js"

dotenv.config({ path: ".env.local", quiet: true })
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
const apply = process.argv.includes("--apply")
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === "object" ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value
const fingerprint = value => createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex")
const check = result => { if (result.error) throw result.error; return result.data }
const report = []
for (const volume of [1, 2]) {
  const book = check(await db.from("textbooks").select("id,code,is_published,total_pages").eq("code", `eps-topik-2025-workbook-${volume}`).single())
  if (book.is_published) throw new Error("Keep workbook drafts private during correction")
  const rows = check(await db.from("textbook_pages").select("page_number,ocr_payload,updated_at").eq("textbook_id", book.id).order("page_number"))
  const directory = `tmp/workbook-alignment/${book.code}`
  await mkdir(directory, { recursive: true })
  if (!apply) {
    await writeFile(`${directory}/source.json`, JSON.stringify({ book, rows }, null, 2))
    console.log(`${book.code}: exported ${rows.length} current layouts (including admin edits)`)
    continue
  }
  const source = JSON.parse(await readFile(`${directory}/source.json`, "utf8"))
  const corrected = JSON.parse(await readFile(`${directory}/aligned.json`, "utf8"))
  let saved = 0
  for (const page of corrected.pages) {
    const original = source.rows.find(row => row.page_number === page.pageNumber)
    const current = rows.find(row => row.page_number === page.pageNumber)
    const desired = { ...original.ocr_payload, workbook: page.workbook }
    if (fingerprint(current.ocr_payload) === fingerprint(desired)) continue
    if (fingerprint(original.ocr_payload) !== fingerprint(current.ocr_payload)) {
      if (current.ocr_payload?.workbook?.review_status === "reviewed") {
        console.log(`${book.code}/${page.pageNumber}: preserving fields changed by admin; aligning remaining fields`)
        const adminWorkbook = current.ocr_payload.workbook
        page.workbook = { ...page.workbook, source: adminWorkbook.source, review_status: adminWorkbook.review_status, fields: page.workbook.fields.map(field => {
          const previous = original.ocr_payload.workbook.fields.find(item => item.id === field.id)
          const reviewed = adminWorkbook.fields.find(item => item.id === field.id)
          return reviewed && fingerprint(previous) !== fingerprint(reviewed) ? reviewed : field
        }) }
      } else {
        throw new Error(`Layout changed since export: ${book.code}/${page.pageNumber}`)
      }
    }
    const before = original.ocr_payload.workbook
    if (JSON.stringify(before.fields.map(field => field.id)) !== JSON.stringify(page.workbook.fields.map(field => field.id))) throw new Error("Field IDs must not change")
    for (let i = 0; i < before.fields.length; i++) {
      for (const key of ["options", "sources", "targets"]) if (JSON.stringify(before.fields[i][key].map(node => node.id)) !== JSON.stringify(page.workbook.fields[i][key].map(node => node.id))) throw new Error("Option IDs must not change")
    }
    if (fingerprint(before) === fingerprint(page.workbook)) continue
    const updated = await db.from("textbook_pages").update({ ocr_payload: { ...current.ocr_payload, workbook: page.workbook }, updated_at: new Date().toISOString() }).eq("textbook_id", book.id).eq("page_number", page.pageNumber).eq("updated_at", current.updated_at).select("page_number")
    check(updated)
    if (updated.data.length !== 1) throw new Error(`Concurrent edit: ${page.pageNumber}`)
    await writeFile(`tmp/workbook-interactions/${book.code}/${String(page.pageNumber).padStart(4, "0")}.json`, JSON.stringify(page.workbook, null, 2))
    saved++
  }
  await writeFile(`${directory}/aligned.json`, JSON.stringify(corrected))
  report.push({ code: book.code, pages: rows.length, alignedOrReviewedPages: corrected.pages.length, updatedThisRun: saved, summary: corrected.summary })
  console.log(`${book.code}: saved ${saved} aligned layouts; IDs preserved`)
}
if (apply) await writeFile("reports/workbook-alignment-import.json", JSON.stringify({ generatedAt: new Date().toISOString(), books: report }, null, 2))
