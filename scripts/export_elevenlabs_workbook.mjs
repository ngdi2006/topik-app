import { readFile, writeFile, mkdir, stat } from "node:fs/promises"
import { createHash } from "node:crypto"
import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { segmentTranscript, validateSegments } from "./lib/workbook-listening.mjs"

const root = "tmp/workbook-listening-elevenlabs"
const results = []
const combinedText = []
const timestamp = value => {
  const ms = Math.round(value * 1000)
  return `${String(Math.floor(ms / 3600000)).padStart(2, "0")}:${String(Math.floor(ms / 60000) % 60).padStart(2, "0")}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")},${String(ms % 1000).padStart(3, "0")}`
}
const execute = promisify(execFile)
async function run(command, args) {
  const result = await execute(command, args, { encoding: "utf8", windowsHide: true })
  return result.stdout
}
for (let lesson = 1; lesson <= 60; lesson++) {
  try {
    const directory = `${root}/B${lesson}`
    const transcript = JSON.parse(await readFile(`${directory}/transcript.json`, "utf8"))
    if (transcript.provider !== "elevenlabs") throw new Error("Expected ElevenLabs transcript")
    const source = `D:/DATA-E9/MP3-SBT-Q${lesson <= 30 ? 1 : 2}/FULL/B${lesson}.mp3`
    const checksum = createHash("sha256").update(await readFile(source)).digest("hex")
    if (checksum !== transcript.sourceChecksum) throw new Error("Source checksum mismatch")
    const indexed = `${directory}/reindexed-full.mp3`
    await run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", source, "-map", "0:a:0", "-c:a", "copy", "-write_xing", "1", indexed])
    const duration = Number((await run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", indexed])).trim())
    const segments = segmentTranscript(transcript.words, duration)
    validateSegments(segments, duration)
    const count = transcript.words.filter(word => word.type === "word" && word.text?.trim()).length
    if (segments[0].firstWord !== 0 || segments.at(-1).lastWord !== count - 1) throw new Error("Incomplete word coverage")
    await mkdir(`${directory}/clips`, { recursive: true })
    let cursor = 0
    await Promise.all(Array.from({ length: 4 }, async () => {
      while (cursor < segments.length) {
      const segment = segments[cursor++]
      const hash = createHash("sha256").update(`${checksum}:${segment.clipStart}:${segment.clipEnd}`).digest("hex").slice(0, 12)
      const file = `${directory}/clips/${segment.id}-${hash}.mp3`
      let exists = false
      try { exists = (await stat(file)).size > 100 } catch {}
      if (!exists) await run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-ss", String(segment.clipStart), "-i", indexed, "-t", String(segment.clipEnd - segment.clipStart), "-vn", "-c:a", "libmp3lame", "-b:a", "128k", file])
      const actual = Number((await run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", file])).trim())
      if (!Number.isFinite(actual) || Math.abs(actual - (segment.clipEnd - segment.clipStart)) > 0.3) throw new Error(`Clip duration mismatch: ${segment.id}`)
      segment.local_file = file
      }
    }))
    await writeFile(`${directory}/transcript.ko.txt`, transcript.text || segments.map(segment => segment.text_ko).join("\n"))
    await writeFile(`${directory}/transcript.ko.srt`, segments.map((segment, index) => `${index + 1}\n${timestamp(segment.start)} --> ${timestamp(segment.end)}\n${segment.text_ko}\n`).join("\n"))
    await writeFile(`${directory}/segments.json`, JSON.stringify({ lesson, provider: "elevenlabs", model: transcript.model, sourceChecksum: checksum, duration, status: "draft_requires_review", segments }, null, 2))
    combinedText.push(`B${lesson}\n${segments.map(segment => `[${timestamp(segment.start)} --> ${timestamp(segment.end)}] ${segment.text_ko}`).join("\n")}`)
    results.push({ lesson, status: "verified", words: count, clips: segments.length, duration })
    console.log(`B${lesson}: exported text, SRT and ${segments.length} verified clips`)
  } catch (error) {
    results.push({ lesson, status: "failed", error: error.message })
    console.error(`B${lesson}: ${error.message}`)
  }
}
await mkdir("reports", { recursive: true })
if (results.every(result => result.status === "verified")) await writeFile(`${root}/B1-B60.ko.txt`, combinedText.join("\n\n"))
await writeFile("reports/workbook-elevenlabs-export.json", JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2))
if (results.some(result => result.status === "failed")) process.exitCode = 1
