import { createHash } from "node:crypto"
import { readFile, readdir } from "node:fs/promises"
import path from "node:path"
import process from "node:process"
import dotenv from "dotenv"
import sharp from "sharp"
import { createClient } from "@supabase/supabase-js"

dotenv.config({ path: ".env.local" })

const sources = [
  { code: "eps-topik-2025-1", root: "E:\\file sach 2025 export JSON\\2026-08-21_12-45-56-636" },
  { code: "eps-topik-2025-2", root: "E:\\file sach 2025 export JSON\\2026-08-21_12-46-45-764" },
]
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error("Thiếu cấu hình Supabase trong .env.local")
const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
const hash = (buffer) => createHash("sha256").update(buffer).digest("hex")
const batchNumber = (name) => Number(name.match(/-(\d+)\.json$/)?.[1] ?? Number.MAX_SAFE_INTEGER)

async function sourcePages(root) {
  const directory = path.join(root, "batch_output")
  const names = (await readdir(directory)).filter((name) => name.endsWith(".json")).sort((a, b) => batchNumber(a) - batchNumber(b))
  const pages = []
  for (const name of names) {
    const batch = JSON.parse(await readFile(path.join(directory, name), "utf8"))
    for (const page of batch.pages ?? []) pages.push({ pageNumber: Number(page.pageNumber), content: page.image?.content })
  }
  return pages.sort((a, b) => a.pageNumber - b.pageNumber)
}

for (const source of sources) {
  const { data: book, error: bookError } = await supabase.from("textbooks").select("id,total_pages").eq("code", source.code).single()
  if (bookError) throw bookError
  const pages = await sourcePages(source.root)
  if (pages.length !== book.total_pages) throw new Error(`${source.code}: nguồn có ${pages.length}/${book.total_pages} trang`)
  let completed = 0
  let inputBytes = 0
  let outputBytes = 0

  async function optimize(page) {
    if (!page.content) throw new Error(`${source.code}: trang ${page.pageNumber} thiếu ảnh`)
    const input = Buffer.from(page.content, "base64")
    const output = await sharp(input).resize({ width: 1440, withoutEnlargement: true }).webp({ quality: 84, smartSubsample: true, effort: 4 }).toBuffer()
    const storagePath = `${source.code}/pages-webp/${String(page.pageNumber).padStart(4, "0")}.webp`
    const { error: uploadError } = await supabase.storage.from("textbooks").upload(storagePath, output, { contentType: "image/webp", cacheControl: "31536000", upsert: true })
    if (uploadError) throw uploadError
    const { error: updateError } = await supabase.from("textbook_pages").update({ image_path: storagePath, checksum: hash(output), updated_at: new Date().toISOString() }).eq("textbook_id", book.id).eq("page_number", page.pageNumber)
    if (updateError) throw updateError
    inputBytes += input.length
    outputBytes += output.length
    completed += 1
    if (completed % 25 === 0 || completed === pages.length) console.log(`${source.code}: ${completed}/${pages.length}`)
  }

  for (let index = 0; index < pages.length; index += 4) await Promise.all(pages.slice(index, index + 4).map(optimize))
  const coverPath = `${source.code}/pages-webp/0001.webp`
  const { error: coverError } = await supabase.from("textbooks").update({ cover_path: coverPath, updated_at: new Date().toISOString() }).eq("id", book.id)
  if (coverError) throw coverError
  console.log(`${source.code}: ${(inputBytes / 1024 / 1024).toFixed(1)} MB -> ${(outputBytes / 1024 / 1024).toFixed(1)} MB (${Math.round((1 - outputBytes / inputBytes) * 100)}% nhỏ hơn)`)
}

console.log("OPTIMIZATION_OK")
