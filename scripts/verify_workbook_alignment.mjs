import { readFile, writeFile } from "node:fs/promises"
import assert from "node:assert/strict"
import dotenv from "dotenv"
import { createClient } from "@supabase/supabase-js"

dotenv.config({ path: ".env.local", quiet: true })
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const books = []
for (const volume of [1, 2]) {
  const root = `tmp/workbook-alignment/eps-topik-2025-workbook-${volume}`
  const source = JSON.parse(await readFile(`${root}/source.json`, "utf8"))
  const expected = JSON.parse(await readFile(`${root}/aligned.json`, "utf8"))
  const { data, error } = await db.from("textbook_pages").select("page_number,ocr_payload").eq("textbook_id", source.book.id).order("page_number")
  if (error) throw error
  assert.equal(data.length, source.rows.length)
  let aligned = 0; const preservedAdminPages = []
  for (const row of data) {
    const actual = row.ocr_payload.workbook
    const original = source.rows.find(page => page.page_number === row.page_number).ocr_payload.workbook
    const planned = expected.pages.find(page => page.pageNumber === row.page_number)
    assert.deepEqual(actual.fields.map(field => field.id), original.fields.map(field => field.id))
    for (const [index, field] of actual.fields.entries()) for (const key of ["options", "sources", "targets"]) assert.deepEqual(field[key].map(node => node.id), original.fields[index][key].map(node => node.id))
    if (actual.alignment_version === 2) {
      assert.deepEqual(actual, planned.workbook, `Remote alignment differs: ${volume}/${row.page_number}`)
      aligned++
    } else {
      assert.equal(actual.source, "admin_reviewed")
      assert.equal(actual.review_status, "reviewed")
      preservedAdminPages.push(row.page_number)
      planned.workbook = actual
    }
  }
  const book = await db.from("textbooks").select("is_published").eq("id", source.book.id).single()
  if (book.error) throw book.error
  assert.equal(book.data.is_published, false)
  await writeFile(`${root}/aligned.json`, JSON.stringify(expected))
  books.push({ volume, pages: data.length, alignedPages: aligned, preservedAdminPages, questionAndOptionIdsPreserved: true, adminOnly: true })
}
await writeFile("reports/workbook-alignment-verification.json", JSON.stringify({ verifiedAt: new Date().toISOString(), books }, null, 2))
console.log(JSON.stringify(books, null, 2))
