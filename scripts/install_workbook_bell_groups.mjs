import { readFile, writeFile, mkdir } from "node:fs/promises"
import { createHash } from "node:crypto"
import { createRequire } from "node:module"
import vm from "node:vm"
import ts from "typescript"
import dotenv from "dotenv"
import { createClient } from "@supabase/supabase-js"

dotenv.config({ path: ".env.local", quiet: true })
const args = process.argv.slice(2)
const option = (key, fallback) => args.includes(`--${key}`) ? args[args.indexOf(`--${key}`) + 1] : fallback
const first = Number(option("from", 1)), last = Number(option("to", 60))
const apply = args.includes("--apply"), verifyOnly = args.includes("--verify-only")
if (apply && verifyOnly || !Number.isInteger(first) || !Number.isInteger(last) || first < 1 || last > 60 || first > last) throw new Error("Invalid options")
const hash = bytes => createHash("sha256").update(bytes).digest("hex")
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === "object" ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value
const same = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b))
const root = "tmp/workbook-listening-elevenlabs"
const schema = {}
vm.runInNewContext(ts.transpileModule(await readFile("src/lib/textbooks/listening.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: schema, require: createRequire(import.meta.url) })
const prepared = []
// Validate every local result before touching remote metadata.
for (let lesson = first; lesson <= last; lesson++) {
  const directory = `${root}/B${lesson}/question-groups`
  const report = JSON.parse(await readFile(`${directory}/report.json`, "utf8"))
  if (report.lesson !== lesson || !report.cutsVerified || !Object.values(report.checks).every(Boolean) || !report.groups.length) throw new Error(`B${lesson}: unverified preparation`)
  const volume = lesson <= 30 ? 1 : 2
  const code = `eps-topik-2025-workbook-${volume}`
  const segments = []
  for (const [index, group] of report.groups.entries()) {
    const bytes = await readFile(`${directory}/${group.file}`)
    if (hash(bytes) !== group.clipChecksum) throw new Error(`B${lesson}: clip changed after verification`)
    const audio_path = `${code}/audio-groups-elevenlabs/B${lesson}/${group.clipChecksum.slice(0, 16)}/${group.file}`
    segments.push({ id: `s${String(900001 + index)}`, index: index + 1, start: group.start, end: group.end, clipStart: group.start, clipEnd: group.end, text_ko: group.text_ko, text_vi: "", section: "listening", role: "instruction", questionNumber: group.startQ, questionEndNumber: group.endQ, groupInstruction: group.instruction, pageNumber: group.pageNumber, anchorY: group.anchorY, uncertain: false, audio_path })
  }
  const manifest = { version: 1, status: "draft", sourceChecksum: report.sourceChecksum, duration: report.duration, lesson, transcriptionProvider: "elevenlabs", transcriptionModel: "scribe_v2", segmentation: "printed_question_groups_bell", boundaryRule: report.boundaryRule, boundaryNotes: report.notes, segments, answerGuide: [] }
  const waveforms = await readFile(`${directory}/waveforms.json`, "utf8").then(JSON.parse).catch(error => { if (error.code === "ENOENT") return null; throw error })
  if (waveforms) {
    if (waveforms.sourceChecksum !== report.sourceChecksum) throw new Error(`B${lesson}: stale full-track waveform`)
    manifest.waveform = waveforms.full.peaks
    for (const [index, segment] of segments.entries()) {
      const waveform = waveforms.groups[segment.id]
      if (waveform?.audioChecksum !== report.groups[index].clipChecksum) throw new Error(`B${lesson}: stale group waveform`)
      segment.waveform = waveform.peaks
    }
  }
  if (!schema.parseListening({ listening: manifest })) throw new Error(`B${lesson}: manifest fails application schema`)
  await writeFile(`${directory}/web-manifest.json`, JSON.stringify(manifest, null, 2))
  prepared.push({ lesson, code, directory, report, manifest })
}
const preflight = { lessons: prepared.length, groups: prepared.reduce((sum, item) => sum + item.manifest.segments.length, 0), bellBoundaries: prepared.reduce((sum, item) => sum + item.report.groups.filter(group => group.bell).length, 0) }
console.log(`Preflight: ${JSON.stringify(preflight)}`)
if (!apply && !verifyOnly) {
  await writeFile("reports/workbook-batch-group-preflight.json", JSON.stringify(preflight, null, 2))
  process.exit(0)
}
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
const check = result => { if (result.error) throw result.error; return result.data }
async function retry(operation) {
  for (let attempt = 0; ; attempt++) {
    try { return await operation() } catch (error) { if (attempt >= 2) throw error; await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1))) }
  }
}
const books = check(await db.from("textbooks").select("id,code").in("code", ["eps-topik-2025-workbook-1", "eps-topik-2025-workbook-2"]))
await mkdir(`${root}/backups`, { recursive: true })
const results = []
let cursor = 0
await Promise.all(Array.from({ length: 3 }, async () => {
  while (cursor < prepared.length) {
    const item = prepared[cursor++]
    const { lesson, directory, report, manifest } = item
    try {
      const book = books.find(book => book.code === item.code)
      if (!book) throw new Error("Workbook not found")
      const unit = check(await db.from("textbook_units").select("id,start_page,end_page").eq("textbook_id", book.id).eq("unit_number", lesson).single())
      const resources = check(await db.from("textbook_resources").select("id,metadata").eq("unit_id", unit.id).eq("kind", "audio"))
      const resource = resources.find(resource => resource.metadata?.source_file === `B${lesson}.mp3`)
      if (!resource || resource.metadata.listening?.sourceChecksum !== manifest.sourceChecksum) throw new Error("Remote original checksum mismatch")
      for (const segment of manifest.segments) {
        if (segment.pageNumber < unit.start_page || segment.pageNumber > unit.end_page) throw new Error("Group points outside its unit")
      }
      const alreadyInstalled = same(resource.metadata.listening, manifest)
      let backup = null
      if (apply && !alreadyInstalled) {
        backup = `${root}/backups/B${lesson}-batch-${Date.now()}.json`
        await writeFile(backup, JSON.stringify({ resourceId: resource.id, metadata: resource.metadata }, null, 2), { flag: "wx" })
      }
      for (const [index, segment] of manifest.segments.entries()) {
        const bytes = await readFile(`${directory}/${report.groups[index].file}`)
        if (apply && !alreadyInstalled) await retry(async () => check(await db.storage.from("textbooks").upload(segment.audio_path, bytes, { contentType: "audio/mpeg", cacheControl: "31536000", upsert: true })))
        const remote = await retry(async () => check(await db.storage.from("textbooks").download(segment.audio_path)))
        if (hash(Buffer.from(await remote.arrayBuffer())) !== hash(bytes)) throw new Error("Remote clip bytes differ")
      }
      if (apply && !alreadyInstalled) {
        const current = check(await db.from("textbook_resources").select("metadata").eq("id", resource.id).single())
        if (!same(current.metadata, resource.metadata)) throw new Error("Concurrent resource edit; cancelled")
        const changed = check(await db.from("textbook_resources").update({ metadata: { ...current.metadata, listening: manifest } }).eq("id", resource.id).eq("metadata->listening->>sourceChecksum", manifest.sourceChecksum).eq("metadata->listening->>transcriptionProvider", resource.metadata.listening.transcriptionProvider).eq("metadata->>storage_path", resource.metadata.storage_path).select("id"))
        if (changed.length !== 1) throw new Error("Concurrent resource edit; cancelled")
      }
      const saved = check(await db.from("textbook_resources").select("metadata").eq("id", resource.id).single())
      if (!same(saved.metadata.listening, manifest)) {
        // JSONB key ordering differs; compare parsed schema and provenance.
        const actual = schema.parseListening(saved.metadata)
        if (!actual || JSON.stringify(actual) !== JSON.stringify(schema.parseListening({ listening: manifest })) || saved.metadata.listening.segmentation !== manifest.segmentation) throw new Error("Saved manifest does not match expected groups")
      }
      results.push({ lesson, status: apply ? "installed_verified" : "remote_verified", groups: manifest.segments.length, bells: report.groups.filter(group => group.bell).length, removedOldSegments: resource.metadata.listening.segments.length, backup, href: `/textbooks/${book.id}/read?page=${manifest.segments[0].pageNumber}` })
      console.log(`B${lesson}: ${manifest.segments.length} groups installed and remote bytes verified`)
    } catch (error) {
      results.push({ lesson, status: "failed", error: error.message || String(error) })
      console.error(`B${lesson}: FAILED ${error.message || String(error)}`)
    }
    await writeFile(`reports/workbook-batch-group-${apply ? "install" : "remote-verification"}.json`, JSON.stringify({ generatedAt: new Date().toISOString(), ...preflight, results: [...results].sort((a,b) => a.lesson-b.lesson) }, null, 2))
  }
}))
await writeFile(`reports/workbook-batch-group-${apply ? "install" : "remote-verification"}.json`, JSON.stringify({ generatedAt: new Date().toISOString(), ...preflight, results: [...results].sort((a,b) => a.lesson-b.lesson) }, null, 2))
if (results.some(result => result.status === "failed")) process.exitCode = 1
