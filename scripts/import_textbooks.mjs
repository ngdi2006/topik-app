import { createHash } from "node:crypto"
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises"
import path from "node:path"
import process from "node:process"
import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

const DEFAULT_SOURCES = [
  { code: "eps-topik-2025-1", volume: 1, titleKo: "일상생활 한국어 1", titleVi: "Giáo trình EPS-TOPIK 2025 - Quyển 1", firstUnit: 1, lastUnit: 30, firstUnitPage: 50, defaultPath: "E:\\file sach 2025 export JSON\\2026-08-21_12-45-56-636" },
  { code: "eps-topik-2025-2", volume: 2, titleKo: "직장생활 한국어 2", titleVi: "Giáo trình EPS-TOPIK 2025 - Quyển 2", firstUnit: 31, lastUnit: 60, firstUnitPage: 16, defaultPath: "E:\\file sach 2025 export JSON\\2026-08-21_12-46-45-764" },
]

function args() {
  const values = new Map()
  for (let index = 2; index < process.argv.length; index += 1) {
    const key = process.argv[index]
    if (key.startsWith("--")) values.set(key.slice(2), process.argv[index + 1]?.startsWith("--") ? true : process.argv[++index] ?? true)
  }
  return values
}

function batchNumber(name) { return Number(name.match(/-(\d+)\.json$/)?.[1] ?? Number.MAX_SAFE_INTEGER) }
function sha(value) { return createHash("sha256").update(value).digest("hex") }
function unitRanges(book, totalPages) {
  return Array.from({ length: book.lastUnit - book.firstUnit + 1 }, (_, index) => {
    const number = book.firstUnit + index
    const startPage = book.firstUnitPage + index * 10
    return { unit_number: number, start_page: startPage, end_page: Math.min(totalPages, startPage + 9), sort_order: index, title_ko: null, title_vi: `Bài ${number}`, metadata: { review_status: "needs_review", mapping: "deterministic_10_page_range" }, is_published: false }
  })
}

async function inspectBook(book, sourcePath) {
  const topLevel = await readdir(sourcePath)
  const batchPath = topLevel.includes("batch_output") ? path.join(sourcePath, "batch_output") : sourcePath
  const files = await readdir(batchPath)
  const batches = files.filter((name) => name.endsWith(".json") && name !== "raw_document.json").sort((a, b) => batchNumber(a) - batchNumber(b))
  if (batches.length === 0) throw new Error(`${book.code}: không tìm thấy batch JSON trong ${batchPath}`)
  const raw = JSON.parse(await readFile(path.join(sourcePath, "raw_document.json"), "utf8"))
  const ocrByPage = new Map((raw.pages ?? []).map((page) => [Number(page.pageNumber), page]))
  const pages = []
  const seen = new Set()
  let imageBytes = 0
  for (const file of batches) {
    const batch = JSON.parse(await readFile(path.join(batchPath, file), "utf8"))
    for (const item of batch.pages ?? []) {
      const pageNumber = Number(item.pageNumber)
      if (!pageNumber || seen.has(pageNumber)) throw new Error(`${book.code}: trang trùng/không hợp lệ ${pageNumber}`)
      seen.add(pageNumber)
      const content = item.image?.content
      if (!content) throw new Error(`${book.code}: trang ${pageNumber} thiếu ảnh`)
      imageBytes += Buffer.byteLength(content, "base64")
      const rawPage = ocrByPage.get(pageNumber) ?? {}
      const paragraphs = rawPage.paragraphs ?? item.paragraphs ?? []
      pages.push({ pageNumber, content, width: item.dimension?.width ?? rawPage.width ?? null, height: item.dimension?.height ?? rawPage.height ?? null, ocrText: paragraphs.map((paragraph) => paragraph.text ?? paragraph.layout?.textAnchor?.content).filter(Boolean).join("\n"), paragraphs })
    }
  }
  pages.sort((a, b) => a.pageNumber - b.pageNumber)
  if (pages.length === 0) throw new Error(`${book.code}: batch không chứa trang nào`)
  if (pages.some((page, index) => page.pageNumber !== index + 1)) throw new Error(`${book.code}: chuỗi trang không liên tục`)
  return { ...book, sourcePath, rawMetadata: raw.metadata ?? {}, pages, units: unitRanges(book, pages.length), batches: batches.length, imageBytes }
}

async function uploadBook(client, book) {
  const sourceHash = sha(JSON.stringify({ metadata: book.rawMetadata, pageCount: book.pages.length, imageBytes: book.imageBytes }))
  const { data: textbook, error } = await client.from("textbooks").upsert({ code: book.code, title_ko: book.titleKo, title_vi: book.titleVi, volume: book.volume, edition: "2025", total_pages: book.pages.length, source_hash: sourceHash, metadata: { source_path: book.sourcePath, import_version: 1 }, is_published: false }, { onConflict: "code" }).select("id").single()
  if (error) throw error
  let uploaded = 0
  async function uploadPage(page) {
    const storagePath = `${book.code}/pages/${String(page.pageNumber).padStart(4, "0")}.png`
    const image = Buffer.from(page.content, "base64")
    const upload = await client.storage.from("textbooks").upload(storagePath, image, { contentType: "image/png", cacheControl: "31536000", upsert: true })
    if (upload.error) throw upload.error
    const upsert = await client.from("textbook_pages").upsert({ textbook_id: textbook.id, page_number: page.pageNumber, image_path: storagePath, width: page.width, height: page.height, ocr_text: page.ocrText, ocr_payload: { paragraphs: page.paragraphs }, checksum: sha(image) }, { onConflict: "textbook_id,page_number" })
    if (upsert.error) throw upsert.error
    uploaded += 1
    if (uploaded % 25 === 0 || uploaded === book.pages.length) console.log(`${book.code}: ${uploaded}/${book.pages.length}`)
  }
  for (let index = 0; index < book.pages.length; index += 5) {
    await Promise.all(book.pages.slice(index, index + 5).map(uploadPage))
  }
  const unitRows = book.units.map((unit) => ({ ...unit, textbook_id: textbook.id }))
  const units = await client.from("textbook_units").upsert(unitRows, { onConflict: "textbook_id,unit_number" })
  if (units.error) throw units.error
  await client.from("textbooks").update({ cover_path: `${book.code}/pages/0001.png` }).eq("id", textbook.id)
}

const options = args()
const shouldUpload = options.get("upload") === true
const output = String(options.get("output") || path.join(process.cwd(), "tmp", "textbook-import-report.json"))
const books = []
for (const config of DEFAULT_SOURCES) {
  const sourcePath = String(options.get(`book${config.volume}`) || config.defaultPath)
  console.log(`Kiểm tra ${config.code}: ${sourcePath}`)
  books.push(await inspectBook(config, sourcePath))
}
const report = { generatedAt: new Date().toISOString(), mode: shouldUpload ? "upload" : "dry-run", books: books.map(({ code, titleVi, pages, units, batches, imageBytes }) => ({ code, title: titleVi, pages: pages.length, units: units.length, batches, decodedImageMB: Number((imageBytes / 1024 / 1024).toFixed(2)), firstPage: pages[0]?.pageNumber, lastPage: pages.at(-1)?.pageNumber })) }
await mkdir(path.dirname(output), { recursive: true })
await writeFile(output, JSON.stringify(report, null, 2))
console.table(report.books)
console.log(`Báo cáo: ${output}`)

if (shouldUpload) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error("Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY")
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  for (const book of books) await uploadBook(client, book)
  console.log("Upload hoàn tất. Giáo trình vẫn ở trạng thái nháp để quản trị viên kiểm duyệt.")
} else console.log("Dry-run hoàn tất, chưa ghi database hoặc Storage. Dùng --upload để nhập thật.")
