import { readFile, mkdir, writeFile } from "node:fs/promises"
import { createHash } from "node:crypto"
import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"
import { workbookUnits } from "./workbook-toc-data.mjs"

dotenv.config({ path: ".env.local", quiet: true })
const books = JSON.parse(await readFile("tmp/workbooks-2025/manifest.json", "utf8"))
const upload = process.argv.includes("--upload")
const client = upload ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } }) : null
const reports = []
function check(result) { if (result.error) throw result.error; return result.data }
async function retry(action) {
  for (let attempt = 0; ; attempt++) {
    try { return check(await action()) } catch (error) {
      if (attempt >= 3) throw error
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)))
    }
  }
}
for (const book of books) {
  if (book.pages.length !== book.total_pages || book.pages.some((page, index) => page.page_number !== index + 1)) throw new Error(`Invalid pages: ${book.code}`)
  console.log(`${book.code}: ${book.total_pages} pages; ${upload ? "upload" : "dry run"}`)
  if (!upload) continue
  const existing = check(await client.from("textbooks").select("id,source_hash,is_published").eq("code", book.code).maybeSingle())
  if (existing && existing.source_hash !== book.source_hash) throw new Error(`Source changed: ${book.code}`)
  const row = existing || check(await client.from("textbooks").insert({ code: book.code, title_vi: book.title_vi, title_ko: book.title_ko, volume: book.volume, edition: "2025", total_pages: book.total_pages, source_hash: book.source_hash, metadata: { kind: "workbook", source_file: book.source_file, ocr_status: "not_available", unit_mapping: "visually_verified_pdf_headers" }, is_published: false }).select("id").single())
  const stored = check(await client.from("textbook_pages").select("page_number,checksum").eq("textbook_id", row.id))
  const checksums = new Map(stored.map(page => [page.page_number, page.checksum]))
  for (let offset = 0; offset < book.pages.length; offset += 4) {
    await Promise.all(book.pages.slice(offset, offset + 4).map(async page => {
      const image = await readFile(page.file)
      const checksum = createHash("sha256").update(image).digest("hex")
      if (checksums.get(page.page_number) === checksum) return
      const imagePath = `${book.code}/pages-webp/${String(page.page_number).padStart(4, "0")}.webp`
      await retry(() => client.storage.from("textbooks").upload(imagePath, image, { contentType: "image/webp", cacheControl: "31536000", upsert: true }))
      await retry(() => client.from("textbook_pages").upsert({ textbook_id: row.id, page_number: page.page_number, image_path: imagePath, checksum }, { onConflict: "textbook_id,page_number" }))
    }))
    if (offset % 40 === 0) console.log(`${book.code}: ${Math.min(offset + 4, book.total_pages)}/${book.total_pages}`)
  }
  const count = await client.from("textbook_pages").select("id", { count: "exact", head: true }).eq("textbook_id", row.id)
  check(count)
  if (count.count !== book.total_pages) throw new Error(`Incomplete: ${book.code}`)
  check(await client.from("textbook_units").upsert(workbookUnits(book.volume, book.total_pages).map(unit => ({ ...unit, textbook_id: row.id })), { onConflict: "textbook_id,unit_number" }))
  check(await client.from("textbooks").update({ cover_path: `${book.code}/pages-webp/0001.webp`, is_published: false }).eq("id", row.id))
  for (const number of [1, book.total_pages]) {
    const imagePath = `${book.code}/pages-webp/${String(number).padStart(4, "0")}.webp`
    const blob = check(await client.storage.from("textbooks").download(imagePath))
    const checksum = createHash("sha256").update(Buffer.from(await blob.arrayBuffer())).digest("hex")
    const local = createHash("sha256").update(await readFile(book.pages[number - 1].file)).digest("hex")
    if (checksum !== local) throw new Error(`Storage verification failed: ${imagePath}`)
  }
  reports.push({ code: book.code, id: row.id, pages: count.count, published: false, firstAndLastPageVerified: true })
  await mkdir("reports", { recursive: true })
  await writeFile("reports/workbook-import.json", JSON.stringify({ generatedAt: new Date().toISOString(), books: reports }, null, 2))
  console.log(`${book.code}: saved as admin-only draft and verified`)
}
