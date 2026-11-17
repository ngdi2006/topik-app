import { createHash } from "node:crypto"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { spawnSync } from "node:child_process"
import dotenv from "dotenv"

dotenv.config({ path: ".env.local", quiet: true })
const values = new Map(process.argv.slice(2).map((value, i, all) => value.startsWith("--") ? [value.slice(2), all[i + 1]] : []).filter(pair => pair.length))
const first = Number(values.get("from") || 1)
const last = Number(values.get("to") || 60)
const concurrency = Number(values.get("concurrency") || 2)
const root = values.get("output-root") || "tmp/workbook-listening"
if (!Number.isInteger(first) || !Number.isInteger(last) || first < 1 || last > 60 || first > last || !Number.isInteger(concurrency) || concurrency < 1 || concurrency > 4) throw new Error("Invalid lesson range or concurrency")
await mkdir(root, { recursive: true })
if (!process.env.ELEVENLABS_API_KEY) throw new Error("Missing ELEVENLABS_API_KEY")
let cursor = first
const failures = []
async function transcribe(number) {
  const volume = number <= 30 ? 1 : 2
  const file = `D:/DATA-E9/MP3-SBT-Q${volume}/FULL/B${number}.mp3`
  const bytes = await readFile(file)
  const checksum = createHash("sha256").update(bytes).digest("hex")
  const directory = `${root}/B${number}`
  await mkdir(directory, { recursive: true })
  try {
    const cached = JSON.parse(await readFile(`${directory}/transcript.json`, "utf8"))
    if (cached.provider === "elevenlabs" && cached.model === "scribe_v2" && cached.sourceChecksum === checksum && cached.words?.length) { console.log(`B${number}: cached ${cached.words.length} words`); return }
  } catch {}
  // Rebuild the seek index from MP3 frames; some originals have incorrect headers.
  const indexedFile = `${directory}/reindexed-full.mp3`
  const reindex = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", file, "-map", "0:a:0", "-c:a", "copy", "-write_xing", "1", indexedFile], { encoding: "utf8", windowsHide: true })
  if (reindex.status !== 0) throw new Error(`Cannot rebuild MP3 index: B${number}`)
  const probe = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", indexedFile], { encoding: "utf8", windowsHide: true })
  if (probe.status !== 0) throw new Error(`ffprobe failed: B${number}`)
  const duration = Number(probe.stdout.trim())
  const form = new FormData()
  form.append("file", new Blob([bytes], { type: "audio/mpeg" }), `B${number}.mp3`)
  form.append("model_id", "scribe_v2")
  form.append("language_code", "kor")
  form.append("timestamps_granularity", "word")
  form.append("tag_audio_events", "false")
  form.append("diarize", "true")
  console.log(`B${number}: sending ${Math.round(duration)} seconds to ElevenLabs Scribe`)
  const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", { method: "POST", headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY }, body: form, signal: AbortSignal.timeout(600000) })
  if (!response.ok) throw new Error(`ElevenLabs ${response.status}: ${(await response.text()).slice(0, 450)}`)
  const data = await response.json()
  if (!Array.isArray(data.words) || !data.words.some(word => word.type === "word")) throw new Error("Transcription has no timestamped words")
  if (data.words.some(word => !Number.isFinite(word.start) || !Number.isFinite(word.end) || word.end < word.start || word.end > duration + 2)) throw new Error("Invalid transcription timestamps")
  try {
    const previous = await readFile(`${directory}/transcript.json`, "utf8")
    await writeFile(`${directory}/transcript-backup-${Date.now()}.json`, previous, { flag: "wx" })
  } catch (error) { if (error.code !== "ENOENT") throw error }
  await writeFile(`${directory}/transcript.json`, JSON.stringify({ ...data, sourceChecksum: checksum, duration, needsReindex: true, lesson: number, provider: "elevenlabs", model: "scribe_v2", generatedAt: new Date().toISOString() }, null, 2))
  await writeFile(`${directory}/transcript.ko.txt`, data.text || data.words.filter(word => word.type === "word").map(word => word.text).join(" "))
  console.log(`B${number}: saved ${data.words.length} timestamped entries`)
}
await Promise.all(Array.from({ length: concurrency }, async () => {
  while (cursor <= last) {
    const number = cursor++
    try { await transcribe(number) } catch (error) { failures.push({ lesson: number, error: error.message }); console.error(`B${number}: ${error.message}`); if (/401|402|403|quota|credits/i.test(error.message)) { cursor = last + 1; break } }
  }
}))
await writeFile(`${root}/transcription-run.json`, JSON.stringify({ generatedAt: new Date().toISOString(), first, last, failures }, null, 2))
if (failures.length) process.exitCode = 1
