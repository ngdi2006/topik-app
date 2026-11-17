import { createHash } from "node:crypto"
import { mkdir, readFile, writeFile, stat } from "node:fs/promises"
import { spawnSync } from "node:child_process"
import dotenv from "dotenv"
import { createClient } from "@supabase/supabase-js"
import { segmentTranscript, validateSegments } from "./lib/workbook-listening.mjs"

dotenv.config({ path: ".env.local", quiet: true })
const argv = process.argv.slice(2)
const option = (name, fallback) => argv.includes(`--${name}`) ? argv[argv.indexOf(`--${name}`) + 1] : fallback
const first = Number(option("from", 1)); const last = Number(option("to", 60))
const shouldCut = argv.includes("--cut"); const shouldUpload = argv.includes("--upload")
const db = shouldUpload ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } }) : null
const check = result => { if (result.error) throw result.error; return result.data }
const report = []

async function translate(batch, previous, number) {
  const prompt = `Translate recorded Korean EPS-TOPIK workbook lesson ${number} into clear, accurate Vietnamese. Return JSON {"segments":[{"id":"unchanged", "text_vi":"translation", "section":"vocabulary|grammar|writing|reading|listening|intro|other", "role":"instruction|question|dialogue|option|answer|explanation|other", "questionNumber":null, "uncertain":false}]}.
Return exactly one entry per input id, in the same order. Do not edit Korean, change timestamps, solve questions, invent missing speech or correct the recording. Translate spoken questions and options faithfully, including numbers, negation, names and safety terms. Classify question numbers only when stated in the audio/context; question numbering restarts in different sections. Mark uncertain when the source is unclear. "answer" means the speaker explicitly narrates a correct answer, never your inference. Keep instructional examples separate. Previous context: ${JSON.stringify(previous.map(segment => ({ id: segment.id, text_ko: segment.text_ko })))}. Input: ${JSON.stringify(batch.map(segment => ({ id: segment.id, text_ko: segment.text_ko })))}`
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent", {
    method: "POST", headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY }, signal: AbortSignal.timeout(180000),
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json", temperature: 0, thinkingConfig: { thinkingBudget: 0 }, maxOutputTokens: 12000 } }),
  })
  if (!response.ok) throw new Error(`Translation API ${response.status}: ${(await response.text()).slice(0, 200)}`)
  const data = await response.json()
  const output = JSON.parse(data.candidates?.[0]?.content?.parts?.filter(part => !part.thought).map(part => part.text || "").join(""))
  const items = Array.isArray(output) ? output : output.segments
  if (!Array.isArray(items) || items.length !== batch.length || items.some((item, index) => item.id !== batch[index].id || typeof item.text_vi !== "string" || !item.text_vi.trim())) throw new Error("Translation omitted or reordered a sentence")
  return items
}

for (let number = first; number <= last; number++) {
  const root = `tmp/workbook-listening/B${number}`
  let transcript
  try { transcript = JSON.parse(await readFile(`${root}/transcript.json`, "utf8")) } catch { console.log(`B${number}: waiting for transcript`); report.push({ lesson: number, status: "waiting_for_transcript" }); continue }
  const volume = number <= 30 ? 1 : 2
  const sourceFile = `D:/DATA-E9/MP3-SBT-Q${volume}/FULL/B${number}.mp3`
  const checksum = createHash("sha256").update(await readFile(sourceFile)).digest("hex")
  if (checksum !== transcript.sourceChecksum) throw new Error(`Source changed: B${number}`)
  const clipSource = transcript.needsReindex ? `${root}/reindexed-full.mp3` : sourceFile
  const base = transcript.segments || segmentTranscript(transcript.words, transcript.duration)
  validateSegments(base, transcript.duration)
  const segments = []
  for (let offset = 0; offset < base.length; offset += 30) {
    const batch = base.slice(offset, offset + 30)
    const inputHash = createHash("sha256").update(JSON.stringify(batch)).digest("hex")
    const cachePath = `${root}/translation-${offset}.json`
    let cached
    try { cached = JSON.parse(await readFile(cachePath, "utf8")); if (cached.sourceChecksum !== checksum || cached.inputHash !== inputHash || JSON.stringify(cached.ids) !== JSON.stringify(batch.map(segment => segment.id))) cached = null } catch {}
    const translated = batch.every(segment => typeof segment.text_vi === "string" && segment.text_vi.trim()) ? batch : cached?.segments || await translate(batch, base.slice(Math.max(0, offset - 5), offset), number)
    await writeFile(cachePath, JSON.stringify({ sourceChecksum: checksum, inputHash, ids: batch.map(segment => segment.id), segments: translated }, null, 2))
    segments.push(...batch.map((segment, index) => ({ ...segment,
      text_vi: translated[index].text_vi,
      section: ["vocabulary", "grammar", "writing", "reading", "listening", "intro"].includes(translated[index].section) ? translated[index].section : "other",
      role: ["instruction", "question", "dialogue", "option", "answer", "explanation"].includes(translated[index].role) ? translated[index].role : "other",
      questionNumber: Number.isInteger(translated[index].questionNumber) && translated[index].questionNumber > 0 && translated[index].questionNumber <= 200 ? translated[index].questionNumber : null,
      uncertain: translated[index].uncertain !== false,
    })))
  }
  const manifest = { version: 1, status: "draft", sourceChecksum: checksum, duration: transcript.duration, lesson: number, transcriptionProvider: transcript.provider, transcriptionModel: transcript.model, translationProvider: "gemini", segments, answerGuide: [] }
  await mkdir(`${root}/clips`, { recursive: true })
  for (const segment of segments) {
    const clipHash = createHash("sha256").update(`${checksum}:${segment.clipStart}:${segment.clipEnd}`).digest("hex").slice(0, 12)
    const file = `${root}/clips/${segment.id}-${clipHash}.mp3`
    segment.local_file = file
    segment.clip_hash = clipHash
    if (shouldCut) {
      let exists = false
      try { exists = (await stat(file)).size > 100 } catch {}
      if (!exists) {
        const result = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-ss", segment.clipStart.toFixed(4), "-i", clipSource, "-t", (segment.clipEnd - segment.clipStart).toFixed(4), "-map", "0:a:0", "-vn", "-c:a", "libmp3lame", "-b:a", "128k", file], { encoding: "utf8", windowsHide: true })
        if (result.status !== 0) throw new Error(`Cut B${number}/${segment.id}: ${result.stderr.slice(0, 200)}`)
      }
      const probe = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", file], { encoding: "utf8", windowsHide: true })
      const actual = Number(probe.stdout.trim())
      if (probe.status !== 0 || !Number.isFinite(actual) || Math.abs(actual - (segment.clipEnd - segment.clipStart)) > 0.3) throw new Error(`Invalid clip duration B${number}/${segment.id}`)
    }
  }
  if (db) {
    const book = check(await db.from("textbooks").select("id,code,is_published").eq("code", `eps-topik-2025-workbook-${volume}`).single())
    if (book.is_published) throw new Error("Keep workbook in admin preview")
    const unit = check(await db.from("textbook_units").select("id").eq("textbook_id", book.id).eq("unit_number", number).single())
    const resources = check(await db.from("textbook_resources").select("id,metadata").eq("unit_id", unit.id).eq("kind", "audio"))
    const resource = resources.find(item => item.metadata?.source_file === `B${number}.mp3`)
    if (!resource) throw new Error(`Missing original audio resource B${number}`)
    const old = resource.metadata?.listening
    for (const segment of segments) {
      segment.audio_path = `${book.code}/audio-clips/B${number}/${checksum.slice(0, 12)}/${segment.id}-${segment.clip_hash}.mp3`
      if (old?.sourceChecksum === checksum && old.segments?.some(item => item.id === segment.id && item.audio_path === segment.audio_path)) continue
      check(await db.storage.from("textbooks").upload(segment.audio_path, await readFile(segment.local_file), { contentType: "audio/mpeg", cacheControl: "31536000", upsert: true }))
    }
    // Reload to preserve independently edited audio metadata or reviewed guides.
    const current = check(await db.from("textbook_resources").select("metadata").eq("id", resource.id).single())
    if (current.metadata?.listening?.answerGuide?.length) manifest.answerGuide = current.metadata.listening.answerGuide
    const metadata = { ...current.metadata, listening: manifest }
    if (transcript.needsReindex) {
      const repairedPath = `${book.code}/audio/B${number}-${checksum.slice(0,12)}-reindexed.mp3`
      if (metadata.storage_path !== repairedPath) check(await db.storage.from("textbooks").upload(repairedPath, await readFile(clipSource), { contentType: "audio/mpeg", cacheControl: "31536000", upsert: true }))
      metadata.original_storage_path = metadata.original_storage_path || metadata.storage_path
      metadata.storage_path = repairedPath
      metadata.playback_index_repaired = true
    }
    check(await db.from("textbook_resources").update({ metadata }).eq("id", resource.id))
  }
  await writeFile(`${root}/manifest.json`, JSON.stringify(manifest, null, 2))
  report.push({ lesson: number, status: db ? "uploaded_draft" : "prepared", segments: segments.length, duration: transcript.duration })
  console.log(`B${number}: ${segments.length} bilingual sentences${shouldCut ? ", clips verified" : ""}${db ? ", uploaded" : ""}`)
}
await mkdir("reports", { recursive: true })
await writeFile("reports/workbook-listening-preparation.json", JSON.stringify({ generatedAt: new Date().toISOString(), lessons: report }, null, 2))
