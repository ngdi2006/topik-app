import { createHash } from "node:crypto"
import { readFile, readdir, stat, mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import dotenv from "dotenv"
import { createClient } from "@supabase/supabase-js"

dotenv.config({ path: ".env.local", quiet: true })
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
function check(result) { if (result.error) throw result.error; return result.data }
const sources = []
for (const volume of [1, 2]) {
  const root = `D:/DATA-E9/MP3-SBT-Q${volume}/FULL`
  for (const name of await readdir(root)) {
    const match = /^B(\d+)\.mp3$/i.exec(name)
    if (match) sources.push({ volume, number: Number(match[1]), file: path.join(root, name), bytes: (await stat(path.join(root, name))).size })
  }
}
const largest = Math.max(...sources.map(source => source.bytes))
const bucket = check(await db.storage.getBucket("textbooks"))
if (Number(bucket.file_size_limit) < largest) {
  check(await db.storage.updateBucket("textbooks", { public: false, fileSizeLimit: Math.ceil(largest / (1024 * 1024)) * 1024 * 1024, allowedMimeTypes: bucket.allowed_mime_types }))
}
const report = []
for (const volume of [1, 2]) {
  const book = check(await db.from("textbooks").select("id,code,is_published").eq("code", `eps-topik-2025-workbook-${volume}`).single())
  if (book.is_published) throw new Error("Workbook must remain draft")
  const units = check(await db.from("textbook_units").select("id,unit_number").eq("textbook_id", book.id).gt("unit_number", 0).order("unit_number"))
  const existing = check(await db.from("textbook_resources").select("id,metadata").in("unit_id", units.map(unit => unit.id)).eq("kind", "audio"))
  for (const unit of units) {
    const source = sources.find(item => item.volume === volume && item.number === unit.unit_number)
    if (!source) { report.push({ volume, unit: unit.unit_number, status: "missing_source" }); continue }
    const bytes = await readFile(source.file)
    if (bytes.subarray(0, 3).toString() !== "ID3" && !(bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0)) throw new Error(`Invalid MP3: ${source.file}`)
    const checksum = createHash("sha256").update(bytes).digest("hex")
    const hash = createHash("sha256").update(`${book.id}:${unit.id}:workbook-full-audio`).digest("hex")
    const id = `${hash.slice(0,8)}-${hash.slice(8,12)}-4${hash.slice(13,16)}-a${hash.slice(17,20)}-${hash.slice(20,32)}`
    const storagePath = `${book.code}/audio/B${unit.unit_number}-${checksum.slice(0, 12)}.mp3`
    if (!existing.some(resource => resource.id === id && resource.metadata?.checksum === checksum)) {
      check(await db.storage.from("textbooks").upload(storagePath, bytes, { contentType: "audio/mpeg", upsert: true, cacheControl: "31536000" }))
      check(await db.from("textbook_resources").upsert({ id, unit_id: unit.id, kind: "audio", title: `Bài ${unit.unit_number} · File nghe đầy đủ`, resource_url: null, metadata: { storage_path: storagePath, source_file: path.basename(source.file), checksum }, sort_order: 0, is_published: false }, { onConflict: "id" }))
    }
    const signed = check(await db.storage.from("textbooks").createSignedUrl(storagePath, 60))
    const head = await fetch(signed.signedUrl, { method: "HEAD" })
    if (!head.ok || Number(head.headers.get("content-length")) !== bytes.length) throw new Error(`Audio verification failed: ${storagePath}`)
    report.push({ volume, unit: unit.unit_number, bytes: bytes.length, status: "verified", private: true })
    console.log(`Q${volume} bài ${unit.unit_number}: uploaded and verified`)
  }
}
await mkdir("reports", { recursive: true })
await writeFile("reports/workbook-audio-import.json", JSON.stringify({ generatedAt: new Date().toISOString(), files: report }, null, 2))
console.log(`Audio: ${report.filter(item => item.status === "verified").length}/60; missing: ${report.filter(item => item.status === "missing_source").map(item => item.unit).join(", ")}`)
