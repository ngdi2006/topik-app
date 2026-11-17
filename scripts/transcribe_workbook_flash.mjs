// Ground clip times in the original waveform; Gemini transcribes/translates
// identified audio intervals and never invents their timestamps.
import { createHash } from "node:crypto"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { spawnSync } from "node:child_process"
import path from "node:path"
import dotenv from "dotenv"

dotenv.config({ path: ".env.local", quiet: true })
const args = process.argv.slice(2)
const option = (name, fallback) => args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : fallback
const first = Number(option("from", 5)); const last = Number(option("to", 60))
const concurrency = Number(option("concurrency", 2))
let cursor = first
const failures = []; const completed = []
async function processLesson(number) {
  const volume = number <= 30 ? 1 : 2
  const source = `D:/DATA-E9/MP3-SBT-Q${volume}/FULL/B${number}.mp3`
  const checksum = createHash("sha256").update(await readFile(source)).digest("hex")
  const root = `tmp/workbook-listening/B${number}`
  await mkdir(`${root}/recognition`, { recursive: true })
  try {
    const old = JSON.parse(await readFile(`${root}/transcript.json`, "utf8"))
    if (old.sourceChecksum === checksum && old.provider === "gemini" && (old.words?.length || old.segments?.length)) { completed.push(number); console.log(`B${number}: cached Gemini transcript`); return }
  } catch {}
  const probe = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", source], { encoding: "utf8", windowsHide: true })
  const metadataDuration = Number(probe.stdout.trim())
  if (probe.status !== 0 || !metadataDuration) throw new Error("Cannot read source duration")
  const detected = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", source, "-af", "silencedetect=noise=-45dB:d=0.65", "-f", "null", "-"], { encoding: "utf8", windowsHide: true, maxBuffer: 10 * 1024 * 1024 })
  if (detected.status !== 0) throw new Error("Cannot locate waveform pauses")
  await writeFile(`${root}/silences.txt`, detected.stderr)
  const decodedTime = [...detected.stderr.matchAll(/time=(\d+):(\d+):(\d+(?:\.\d+)?)/g)].at(-1)
  const duration = decodedTime ? Number(decodedTime[1]) * 3600 + Number(decodedTime[2]) * 60 + Number(decodedTime[3]) : metadataDuration
  const needsReindex = Math.abs(duration - metadataDuration) > 0.5
  let recognitionSource = source
  if (needsReindex) {
    recognitionSource = `${root}/reindexed-full.mp3`
    const reindex = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", source, "-map", "0:a:0", "-c:a", "copy", "-write_xing", "1", recognitionSource], { encoding: "utf8", windowsHide: true })
    if (reindex.status !== 0) throw new Error("Cannot repair source MP3 seek index")
    console.log(`B${number}: repaired MP3 index (${metadataDuration.toFixed(1)} → ${duration.toFixed(1)} seconds)`)
  }
  const silences = []; let silenceStart = null
  for (const line of detected.stderr.split(/\r?\n/)) {
    const start = /silence_start: ([\d.]+)/.exec(line)
    const end = /silence_end: ([\d.]+)/.exec(line)
    if (start) silenceStart = Number(start[1])
    if (end && silenceStart !== null) { silences.push([silenceStart, Number(end[1])]); silenceStart = null }
  }
  if (silenceStart !== null) silences.push([silenceStart, duration])
  const intervals = []; let end = 0
  for (const [start, stop] of silences) { if (start - end >= 0.18) intervals.push([end, start]); end = stop }
  if (duration - end >= 0.18) intervals.push([end, duration])
  if (!intervals.length) throw new Error("No speech intervals")
  const chunks = intervals.map(([start, end], index) => ({ id: `s${String(index + 1).padStart(4, "0")}`, index: index + 1, start, end, clipStart: Math.max(0, start - 0.18), clipEnd: Math.min(duration, end + 0.2) }))
  const segments = []; const nonSpeech = []
  for (let offset = 0; offset < chunks.length; offset += 16) {
    const batch = chunks.slice(offset, offset + 16)
    const hash = createHash("sha256").update(JSON.stringify({ checksum, batch })).digest("hex")
    const cachedPath = `${root}/recognition/batch-${offset}.json`
    let recognized
    try { const cached = JSON.parse(await readFile(cachedPath, "utf8")); if (cached.hash === hash) recognized = cached.segments } catch {}
    if (!recognized) {
      try {
        const previous = JSON.parse(await readFile(`${root}/recognition/batch-${offset}-raw.json`, "utf8"))
        const parsed = JSON.parse(previous.candidates?.[0]?.content?.parts?.filter(part => !part.thought).map(part => part.text || "").join(""))
        const items = Array.isArray(parsed) ? parsed : parsed.segments
        if (Array.isArray(items) && items.length === batch.length && items.every((item, index) => item.id === batch[index].id && typeof item.text_ko === "string" && typeof item.text_vi === "string" && (item.nonSpeech || (item.text_ko.trim() && item.text_vi.trim())))) {
          recognized = items
          await writeFile(cachedPath, JSON.stringify({ hash, segments: recognized }, null, 2))
        }
      } catch {}
    }
    if (!recognized) {
      const prompt = `Listen to each labeled audio clip from EPS-TOPIK Korean workbook lesson ${number}. The actual audio clips below were cut at measured pauses; do NOT estimate timestamps. Return JSON {"segments":[{"id":"unchanged clip id", "text_ko":"verbatim spoken Korean", "text_vi":"faithful Vietnamese translation", "section":"vocabulary|grammar|writing|reading|listening|intro|other", "role":"instruction|question|dialogue|option|answer|explanation|other", "questionNumber":null, "uncertain":false, "nonSpeech":false}]}.
Return EXACTLY ${batch.length} entries in input order. Preserve every word including instructions, repeated playback, question numbers, options, negation and names. Never solve questions or correct the recording. Translate the speech, not a guessed meaning from the workbook topic. A short number announcement is an instruction for the next question; question numbering resets in new sections. Use prior context only to label questions, never invent content absent from the clip. If music/silence only, use empty texts and nonSpeech true; if speech is unclear, transcribe the audible part and mark uncertain. "answer" only if a speaker explicitly says an answer. Prior spoken context: ${JSON.stringify(segments.slice(-8).map(segment => ({ ko: segment.text_ko, question: segment.questionNumber, role: segment.role })))}.`
      const clipFiles = []; const clipRanges = []; let combinedOffset = 0
      for (const chunk of batch) {
        const file = `${root}/recognition/${chunk.id}.mp3`
        const cut = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-ss", chunk.clipStart.toFixed(4), "-i", recognitionSource, "-t", (chunk.clipEnd - chunk.clipStart).toFixed(4), "-ac", "1", "-ar", "24000", "-b:a", "64k", file], { encoding: "utf8", windowsHide: true })
        if (cut.status !== 0) throw new Error(`Recognition clip failed ${chunk.id}: ${cut.stderr.slice(0, 160)}`)
        const probe = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", file], { encoding: "utf8", windowsHide: true })
        const clipDuration = Number(probe.stdout.trim())
        if (probe.status !== 0 || !clipDuration) throw new Error("Cannot read recognition clip duration")
        clipFiles.push(path.resolve(file).replaceAll("\\", "/"))
        clipRanges.push({ id: chunk.id, from: Number(combinedOffset.toFixed(3)), to: Number((combinedOffset + clipDuration).toFixed(3)) })
        combinedOffset += clipDuration
      }
      const listFile = `${root}/recognition/concat-${offset}.txt`
      await writeFile(listFile, clipFiles.map(file => `file '${file}'`).join("\n"))
      const combinedFile = `${root}/recognition/combined-${offset}.mp3`
      const concat = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", listFile, "-ac", "1", "-ar", "24000", "-b:a", "64k", combinedFile], { encoding: "utf8", windowsHide: true })
      if (concat.status !== 0) throw new Error("Cannot concatenate recognition batch")
      const parts = [{ text: `${prompt}\nThe SINGLE attached audio is the labeled clips concatenated in order. These exact measured offsets identify each clip within that combined recording: ${JSON.stringify(clipRanges)}. Return one entry for EVERY labeled range, even very short announcements. Do not combine separate ranges into one entry.` }, { inlineData: { mimeType: "audio/mp3", data: (await readFile(combinedFile)).toString("base64") } }]
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent", { method: "POST", headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY }, signal: AbortSignal.timeout(180000), body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseMimeType: "application/json", temperature: 0, thinkingConfig: { thinkingBudget: 0 }, maxOutputTokens: 16000 } }) })
          if (!response.ok) throw new Error(`Gemini ${response.status}: ${(await response.text()).slice(0, 250)}`)
          const responseData = await response.json()
          await writeFile(`${root}/recognition/batch-${offset}-raw.json`, JSON.stringify(responseData, null, 2))
          const result = JSON.parse(responseData.candidates?.[0]?.content?.parts?.filter(part => !part.thought).map(part => part.text || "").join(""))
          const items = Array.isArray(result) ? result : result.segments
          if (!Array.isArray(items) || items.length !== batch.length || items.some((segment, index) => segment.id !== batch[index].id || typeof segment.text_ko !== "string" || typeof segment.text_vi !== "string" || (!segment.nonSpeech && (!segment.text_ko.trim() || !segment.text_vi.trim())))) throw new Error("Recognition skipped/reordered clips or omitted speech/translation")
          recognized = items
          await writeFile(cachedPath, JSON.stringify({ hash, segments: recognized }, null, 2))
          break
        } catch (error) { console.log(`B${number} batch ${offset}: ${error.message.slice(0, 160)}`); if (attempt === 3 || /401|403/.test(error.message)) throw error; await new Promise(resolve => setTimeout(resolve, 3000 * (attempt + 1))) }
      }
    }
    for (const [index, item] of recognized.entries()) {
      if (item.nonSpeech && !item.text_ko.trim()) { nonSpeech.push(batch[index]); continue }
      segments.push({ ...batch[index], text_ko: item.text_ko.trim(), text_vi: item.text_vi.trim(),
        section: ["vocabulary", "grammar", "writing", "reading", "listening", "intro"].includes(item.section) ? item.section : "other",
        role: ["instruction", "question", "dialogue", "option", "answer", "explanation"].includes(item.role) ? item.role : "other",
        questionNumber: Number.isInteger(item.questionNumber) && item.questionNumber > 0 && item.questionNumber <= 200 ? item.questionNumber : null,
        uncertain: item.uncertain !== false,
      })
    }
    console.log(`B${number}: transcribed/translated ${Math.min(offset + batch.length, chunks.length)}/${chunks.length} waveform clips`)
  }
  if (!segments.length || nonSpeech.length > chunks.length * 0.25) throw new Error("Too little recognized speech; manual review needed")
  await writeFile(`${root}/transcript.json`, JSON.stringify({ text: segments.map(segment => segment.text_ko).join("\n"), segments, nonSpeech, sourceChecksum: checksum, duration, metadataDuration, needsReindex, lesson: number, provider: "gemini", model: "gemini-2.5-flash", timingSource: "original_waveform_pauses", generatedAt: new Date().toISOString() }, null, 2))
  completed.push(number)
  console.log(`B${number}: saved ${segments.length} bilingual speech clips`)
}
await Promise.all(Array.from({ length: concurrency }, async () => { while (cursor <= last) { const number = cursor++; try { await processLesson(number) } catch (error) { failures.push({ lesson: number, error: error.message }); console.error(`B${number}: ${error.message}`); if (/401|403/.test(error.message)) cursor = last + 1 } } }))
await writeFile("tmp/workbook-listening/flash-transcription-run.json", JSON.stringify({ generatedAt: new Date().toISOString(), first, last, completed, failures }, null, 2))
if (failures.length) process.exitCode = 1
