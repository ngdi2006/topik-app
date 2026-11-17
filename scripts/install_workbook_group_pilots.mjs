import { readFile, writeFile, mkdir } from "node:fs/promises"
import { createHash } from "node:crypto"
import dotenv from "dotenv"
import { createClient } from "@supabase/supabase-js"

dotenv.config({ path: ".env.local", quiet: true })
const apply = process.argv.includes("--apply")
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
const check = result => { if (result.error) throw result.error; return result.data }
const hash = bytes => createHash("sha256").update(bytes).digest("hex")
const book = check(await db.from("textbooks").select("id,code").eq("code", "eps-topik-2025-workbook-1").single())
const results = []
await mkdir("tmp/workbook-listening-elevenlabs/backups", { recursive: true })
for (const lesson of [1, 2]) {
  const root = `tmp/workbook-listening-elevenlabs/B${lesson}/question-groups-pilot`
  const pilot = JSON.parse(await readFile(`${root}/report.json`, "utf8"))
  if (pilot.lesson !== lesson || pilot.groups.length !== 3 || !Object.values(pilot.checks).every(Boolean)) throw new Error("Pilot verification failed")
  if (pilot.boundaryRule !== "100ms_before_group_bell") throw new Error("Expected the user-approved bell boundary rule")
  const unit = check(await db.from("textbook_units").select("id,start_page,end_page").eq("textbook_id", book.id).eq("unit_number", lesson).single())
  const resources = check(await db.from("textbook_resources").select("id,metadata").eq("unit_id", unit.id).eq("kind", "audio"))
  const resource = resources.find(item => item.metadata?.source_file === `B${lesson}.mp3`)
  if (!resource) throw new Error(`Missing B${lesson} resource`)
  if (resource.metadata.listening?.sourceChecksum !== pilot.sourceChecksum) throw new Error("Original recording checksum mismatch")
  const segments = []
  for (const [index, group] of pilot.groups.entries()) {
    const bytes = await readFile(`${root}/${group.file}`)
    const audioPath = `${book.code}/audio-groups-elevenlabs/B${lesson}/${hash(bytes).slice(0, 16)}/${group.file}`
    if (apply) {
      console.log(`B${lesson}: uploading and verifying group ${index + 1}`)
      check(await db.storage.from("textbooks").upload(audioPath, bytes, { contentType: "audio/mpeg", cacheControl: "31536000", upsert: true }))
      const remote = check(await db.storage.from("textbooks").download(audioPath))
      if (hash(Buffer.from(await remote.arrayBuffer())) !== hash(bytes)) throw new Error("Uploaded clip checksum mismatch")
    }
    const [first, last] = group.questions.split("-").map(Number)
    segments.push({ id: `s90000${index + 1}`, index: index + 1, start: group.start, end: group.end, clipStart: group.start, clipEnd: group.end, text_ko: await readFile(`${root}/${group.file.replace(/\.mp3$/, ".ko.txt")}`, "utf8"), text_vi: "", section: "listening", role: "instruction", questionNumber: first, questionEndNumber: last, groupInstruction: group.spokenHeading, uncertain: false, audio_path: audioPath })
  }
  const listening = { version: 1, status: "draft", sourceChecksum: pilot.sourceChecksum, duration: pilot.groups.at(-1).end, lesson, transcriptionProvider: "elevenlabs", transcriptionModel: "scribe_v2", segmentation: "printed_question_groups_pilot", segments, answerGuide: [] }
  listening.segmentation = "printed_question_groups_bell_pilot"
  listening.boundaryRule = pilot.boundaryRule
  if (apply) {
    const backup = `tmp/workbook-listening-elevenlabs/backups/B${lesson}-${Date.now()}.json`
    await writeFile(backup, JSON.stringify({ resourceId: resource.id, metadata: resource.metadata }, null, 2), { flag: "wx" })
    console.log(`B${lesson}: backup saved; replacing listening manifest`)
    const current = check(await db.from("textbook_resources").select("metadata").eq("id", resource.id).single())
    if (JSON.stringify(current.metadata) !== JSON.stringify(resource.metadata)) throw new Error("Concurrent resource edit; replacement cancelled")
    // Keep optimistic predicates short: sending the entire old 60KB JSON in the
    // URL exceeds the database gateway limit.
    const updated = check(await db.from("textbook_resources").update({ metadata: { ...current.metadata, listening } }).eq("id", resource.id).eq("metadata->listening->>sourceChecksum", pilot.sourceChecksum).eq("metadata->listening->>transcriptionProvider", resource.metadata.listening.transcriptionProvider).eq("metadata->>storage_path", resource.metadata.storage_path).select("id"))
    if (updated.length !== 1) throw new Error("Concurrent resource edit; replacement cancelled")
    const saved = check(await db.from("textbook_resources").select("metadata").eq("id", resource.id).single())
    if (JSON.stringify(saved.metadata.listening.segments.map(segment => segment.audio_path)) !== JSON.stringify(segments.map(segment => segment.audio_path)) || saved.metadata.listening.answerGuide.length) throw new Error("Replacement verification failed")
  }
  await writeFile(`${root}/web-manifest.json`, JSON.stringify(listening, null, 2))
  results.push({ lesson, status: apply ? "installed_verified" : "planned", groups: segments.length, removedOldSegments: resource.metadata.listening.segments.length, href: `/textbooks/${book.id}/read?page=${lesson === 1 ? 21 : 28}`, unitId: unit.id, resourceId: resource.id })
}
await writeFile("reports/workbook-group-pilots-install.json", JSON.stringify({ applied: apply, results }, null, 2))
console.log(JSON.stringify(results, null, 2))
