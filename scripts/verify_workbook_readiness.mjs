import { readFile, writeFile } from "node:fs/promises"
import vm from "node:vm"
import ts from "typescript"
import * as zod from "zod"
import dotenv from "dotenv"
import { createClient } from "@supabase/supabase-js"

dotenv.config({ path: ".env.local", quiet: true })
const model = {}
const code = ts.transpileModule(await readFile("src/lib/textbooks/workbook.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
vm.runInNewContext(code, { exports: model, require: () => zod })
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
function check(result) { if (result.error) throw result.error; return result.data }
const report = []
for (const volume of [1, 2]) {
  const book = check(await db.from("textbooks").select("id,code,total_pages,is_published").eq("code", `eps-topik-2025-workbook-${volume}`).single())
  if (book.is_published) throw new Error("Workbooks must remain admin-only")
  const [units, pages] = await Promise.all([
    db.from("textbook_units").select("id,unit_number,start_page,end_page,is_published").eq("textbook_id", book.id).order("sort_order").then(check),
    db.from("textbook_pages").select("page_number,ocr_payload,checksum").eq("textbook_id", book.id).order("page_number").then(check),
  ])
  if (pages.length !== book.total_pages) throw new Error("Missing page rows")
  const counts = { text: 0, choice: 0, match: 0 }
  let answerSlots = 0
  const sections = {}; const empty = []
  for (const page of pages) {
    const workbook = model.parseWorkbookPage(page.ocr_payload)
    if (!workbook) throw new Error(`Missing/invalid workbook layout: Q${volume} page ${page.page_number}`)
    if (page.checksum !== workbook.image_hash) throw new Error(`Image/layout checksum mismatch: Q${volume} page ${page.page_number}`)
    if (!workbook.fields.length) empty.push(page.page_number)
    for (const field of workbook.fields) { counts[field.kind]++; sections[field.section] = (sections[field.section] || 0) + 1; answerSlots += model.fieldTotal(field) }
    if (units.filter(unit => page.page_number >= unit.start_page && page.page_number <= unit.end_page).length !== 1) throw new Error(`Page not mapped to exactly one unit: ${page.page_number}`)
  }
  const resources = check(await db.from("textbook_resources").select("id,unit_id,kind,metadata,is_published").in("unit_id", units.map(unit => unit.id)).eq("kind", "audio"))
  const missingAudio = units.filter(unit => unit.unit_number > 0 && !resources.some(resource => resource.unit_id === unit.id && resource.metadata?.storage_path)).map(unit => unit.unit_number)
  if (missingAudio.length) throw new Error(`Missing audio: ${missingAudio.join(", ")}`)
  report.push({ volume, code: book.code, adminOnly: true, pages: pages.length, entries: units.length, fields: counts, answerSlots, sections, audioLessons: resources.length, pagesWithoutFields: empty })
}
check(await db.from("user_textbook_annotations").select("id,user_id,textbook_id,page_number,kind,rect,content,updated_at").limit(0))
const output = { generatedAt: new Date().toISOString(), books: report, notes: "Layouts were located from scanned pages and remain subject to admin review. Progress measures filled answers, not correctness." }
await writeFile("reports/workbook-interactive-readiness.json", JSON.stringify(output, null, 2))
console.log(JSON.stringify(output, null, 2))
