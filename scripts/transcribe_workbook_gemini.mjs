import { createHash } from "node:crypto"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { spawnSync } from "node:child_process"
import dotenv from "dotenv"

dotenv.config({ path: ".env.local", quiet: true })
const args = process.argv.slice(2)
const option = (name, fallback) => args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : fallback
const first = Number(option("from", 1)); const last = Number(option("to", 60))
const concurrency = Number(option("concurrency", 2))
const model = "gemini-3.5-transcribe"
if (!process.env.GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY")
const seconds = value => typeof value === "number" ? value : typeof value === "string" && /^\d+(\.\d+)?s?$/.test(value) ? Number(value.replace(/s$/, "")) : NaN
const failures = []; const completed = []
let cursor = first
async function transcribe(number) {
  const volume = number <= 30 ? 1 : 2
  const source = `D:/DATA-E9/MP3-SBT-Q${volume}/FULL/B${number}.mp3`
  const checksum = createHash("sha256").update(await readFile(source)).digest("hex")
  const directory = `tmp/workbook-listening/B${number}`
  await mkdir(directory, { recursive: true })
  try {
    const cached = JSON.parse(await readFile(`${directory}/transcript.json`, "utf8"))
    if (cached.sourceChecksum === checksum && cached.words?.length && cached.provider === "gemini") { console.log(`B${number}: cached ${cached.words.length} timestamped words`); completed.push(number); return }
  } catch {}
  const probe = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", source], { encoding: "utf8", windowsHide: true })
  const duration = Number(probe.stdout.trim())
  if (probe.status !== 0 || !duration) throw new Error("Cannot read source duration")
  // A smaller mono copy is used only for recognition. Final clips use the original.
  const encoded = `${directory}/asr-input.mp3`
  const encode = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", source, "-map", "0:a:0", "-ac", "1", "-ar", "32000", "-b:a", "64k", encoded], { encoding: "utf8", windowsHide: true })
  if (encode.status !== 0) throw new Error(`Recognition input encoding failed: ${encode.stderr.slice(0, 150)}`)
  const input = await readFile(encoded)
  console.log(`B${number}: Gemini native transcription, ${Math.round(duration)} seconds`)
  let data
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST", headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY }, signal: AbortSignal.timeout(600000),
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ inlineData: { mimeType: "audio/mp3", data: input.toString("base64") } }] }], generationConfig: { audioTranscriptionConfig: { languageCodes: ["ko-KR"], mode: "VERBATIM", diarization: true, wordTimestamp: true } } }),
    })
    if (!response.ok) {
      const message = `Gemini STT ${response.status}: ${(await response.text()).slice(0, 500)}`
      if (attempt < 2 && [429, 500, 502, 503, 504].includes(response.status)) { console.log(`B${number}: retry ${attempt + 1} after ${response.status}`); await new Promise(resolve => setTimeout(resolve, 5000 * (attempt + 1))); continue }
      throw new Error(message)
    }
    data = await response.json(); break
  }
  await writeFile(`${directory}/gemini-stt-response.json`, JSON.stringify(data, null, 2))
  const words = []; const text = []
  for (const part of data.candidates?.[0]?.content?.parts || []) {
    if (part.text) text.push(part.text)
    const transcription = part.audioTranscription
    if (transcription) for (const word of transcription.words || []) words.push({ text: word.word, start: seconds(word.startOffset), end: seconds(word.endOffset), speaker_id: transcription.speakerLabel || "speaker_1", type: "word" })
  }
  if (!words.length) throw new Error("Gemini returned no native word timestamps; refusing guessed cuts")
  if (words.some(word => !word.text || !Number.isFinite(word.start) || !Number.isFinite(word.end) || word.start < 0 || word.end < word.start || word.end > duration + 0.5)) throw new Error("Invalid native word timing")
  words.sort((a, b) => a.start - b.start || a.end - b.end)
  await writeFile(`${directory}/transcript.json`, JSON.stringify({ text: text.join("\n") || words.map(word => word.text).join(" "), words, language_code: "ko", sourceChecksum: checksum, duration, lesson: number, provider: "gemini", model, generatedAt: new Date().toISOString() }, null, 2))
  console.log(`B${number}: saved ${words.length} native timestamped words`)
  completed.push(number)
}
await Promise.all(Array.from({ length: concurrency }, async () => {
  while (cursor <= last) {
    const number = cursor++
    try { await transcribe(number) } catch (error) { failures.push({ lesson: number, error: error.message }); console.error(`B${number}: ${error.message}`); if (/401|403|API_KEY_INVALID|billing|quota exceeded/i.test(error.message)) cursor = last + 1 }
  }
}))
await mkdir("tmp/workbook-listening", { recursive: true })
await writeFile("tmp/workbook-listening/gemini-transcription-run.json", JSON.stringify({ generatedAt: new Date().toISOString(), first, last, completed, failures }, null, 2))
if (failures.length) process.exitCode = 1
