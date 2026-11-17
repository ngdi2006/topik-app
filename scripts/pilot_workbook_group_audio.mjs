import { readFile, writeFile, mkdir } from "node:fs/promises"
import { createHash } from "node:crypto"
import { spawnSync } from "node:child_process"

// Only explicitly requested pilot lessons; no batch processing or remote writes.
const args = process.argv.slice(2)
const lesson = args.includes("--lesson") ? Number(args[args.indexOf("--lesson") + 1]) : 1
if (![1, 2].includes(lesson)) throw new Error("Only pilot lessons 1 and 2 are supported")
const root = `tmp/workbook-listening-elevenlabs/B${lesson}`
const output = `${root}/question-groups-pilot`
const original = `D:/DATA-E9/MP3-SBT-Q1/FULL/B${lesson}.mp3`
const indexed = `${root}/reindexed-full.mp3`
const transcript = JSON.parse(await readFile(`${root}/transcript.json`, "utf8"))
const source = JSON.parse(await readFile(`${root}/segments.json`, "utf8"))
const checksum = createHash("sha256").update(await readFile(original)).digest("hex")
if (transcript.provider !== "elevenlabs" || checksum !== transcript.sourceChecksum || checksum !== source.sourceChecksum) throw new Error("Source provenance mismatch")
const definitions = lesson === 1 ? [
  { questions: "1-4", printedHeading: "잘 듣고 맞으면 (O), 틀리면 (X) 표하십시오.", spokenHeading: "잘 듣고 맞으면 O, 틀리면 X 표하세요." },
  { questions: "5-8", printedHeading: "잘 듣고 연결하십시오.", spokenHeading: "잘 듣고 연결하세요." },
  { questions: "9-10", printedHeading: "질문에 대답하십시오.", spokenHeading: "질문에 대답하십시오." },
] : [
  { questions: "1-5", printedRange: "1-3", sourcePages: [28, 29], rangeNote: "Printed heading says 1-3; questions 4 and 5 continue on page 29 with the same instruction. Audio announces all five before the next heading at question 6.", printedHeading: "잘 듣고 알맞은 것을 고르십시오.", spokenHeading: "잘 듣고 알맞은 것을 고르세요." },
  { questions: "6-7", printedRange: "6-7", sourcePages: [29], printedHeading: "다음 대화를 듣고 알맞은 그림을 고르십시오.", spokenHeading: "다음 대화를 듣고 알맞은 그림을 고르세요." },
  { questions: "8-10", printedRange: "8-10", sourcePages: [29], printedHeading: "잘 듣고 알맞은 대답을 고르십시오.", spokenHeading: "잘 듣고 알맞은 대답을 고르세요." },
]
const normalize = text => text.replace(/[\s\p{P}]/gu, "")
const anchors = definitions.map(definition => {
  // One printed instruction may span several sentence-level ASR segments.
  const target = normalize(definition.spokenHeading)
  const matches = []
  for (let i = 0; i < source.segments.length; i++) {
    let text = ""
    for (let j = i; j < Math.min(source.segments.length, i + 6); j++) {
      text += normalize(source.segments[j].text_ko)
      if (!target.startsWith(text)) break
      if (text === target) {
        matches.push({ ...source.segments[i], end: source.segments[j].end, lastWord: source.segments[j].lastWord, text_ko: definition.spokenHeading })
        break
      }
    }
  }
  if (matches.length !== 1) throw new Error(`Ambiguous or missing heading: ${definition.questions}`)
  return { ...definition, segment: matches[0] }
})
if (anchors.some((anchor, index) => index && anchor.segment.start <= anchors[index - 1].segment.end)) throw new Error("Headings out of order")
function run(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8", windowsHide: true, maxBuffer: 8 * 1024 * 1024 })
  if (result.status !== 0) throw new Error(`${command}: ${result.stderr?.slice(0, 300)}`)
  return result
}
const detected = run("ffmpeg", ["-hide_banner", "-nostats", "-i", indexed, "-af", "silencedetect=noise=-40dB:d=0.15", "-f", "null", "-"])
const silences = []
let beginning = null
for (const line of detected.stderr.split(/\r?\n/)) {
  const start = /silence_start: ([\d.]+)/.exec(line)
  const end = /silence_end: ([\d.]+)/.exec(line)
  if (start) beginning = Number(start[1])
  if (end && beginning !== null) { silences.push({ start: beginning, end: Number(end[1]) }); beginning = null }
}
const bellDetections = JSON.parse(await readFile("reports/workbook-pilot-bell-detection.json", "utf8"))
const boundaries = anchors.map(anchor => {
  const detection = bellDetections.find(item => item.lesson === lesson && item.questions === anchor.questions)
  if (!detection || detection.sourceChecksum !== checksum || detection.heading !== anchor.segment.start) throw new Error("Missing or stale bell detection")
  const bell = detection.bell
  const time = Math.max(0, bell.start - 0.1)
  const silence = silences.find(item => item.start <= time && item.end >= time && item.end <= bell.start + 0.1)
  if (!silence || bell.end >= anchor.segment.start || bell.start <= detection.previousSpeechEnd) throw new Error("Bell boundary is not safely between speech groups")
  return { time, silence, bell }
})
await mkdir(output, { recursive: true })
const groups = []
for (let index = 0; index < anchors.length; index++) {
  const anchor = anchors[index]
  const start = boundaries[index].time
  const end = boundaries[index + 1]?.time ?? source.duration
  const segments = source.segments.filter(segment => segment.start >= anchor.segment.start && segment.start < (anchors[index + 1]?.segment.start ?? Infinity))
  if (segments.some(segment => segment.start < start || segment.end > end)) throw new Error("Boundary intersects recognized speech")
  const announcedQuestions = [...segments.map(segment => segment.text_ko).join(" ").matchAll(/(\d+)\s*번/g)].map(match => Number(match[1]))
  if (lesson === 2) {
    const [first, last] = anchor.questions.split("-").map(Number)
    const expected = Array.from({ length: last - first + 1 }, (_, offset) => first + offset)
    if (JSON.stringify(announcedQuestions) !== JSON.stringify(expected)) throw new Error(`Question announcements do not match group ${anchor.questions}`)
  }
  const filename = `B${lesson}-${index + 1}-questions-${anchor.questions}.mp3`
  run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-ss", String(start), "-i", indexed, "-t", String(end - start), "-map", "0:a:0", "-vn", "-c:a", "libmp3lame", "-b:a", "128k", `${output}/${filename}`])
  const duration = Number(run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", `${output}/${filename}`]).stdout.trim())
  if (!Number.isFinite(duration) || Math.abs(duration - (end - start)) > 0.1) throw new Error("Clip duration mismatch")
  run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-i", `${output}/${filename}`, "-f", "null", "-"])
  const text = segments.map(segment => segment.text_ko).join("\n")
  await writeFile(`${output}/${filename.replace(/\.mp3$/, ".ko.txt")}`, text)
  groups.push({ file: filename, questions: anchor.questions, announcedQuestions: lesson === 2 ? announcedQuestions : undefined, printedRange: anchor.printedRange, sourcePages: anchor.sourcePages, rangeNote: anchor.rangeNote, printedHeading: anchor.printedHeading, spokenHeading: anchor.spokenHeading, start, end, expectedDuration: end - start, encodedDuration: duration, headingWordStart: anchor.segment.start, boundarySilence: boundaries[index].silence, firstWord: segments[0].firstWord, lastWord: segments.at(-1).lastWord, lastSpokenSentence: segments.at(-1).text_ko, stopsBefore: anchors[index + 1]?.spokenHeading ?? "EOF" })
}
if (groups[0].firstWord !== 0 || groups.at(-1).lastWord !== source.segments.at(-1).lastWord || groups.some((group, index) => index && group.firstWord !== groups[index - 1].lastWord + 1)) throw new Error("Incomplete spoken word coverage")
const report = { lesson, sourceChecksum: checksum, provider: "elevenlabs", status: "pilot_for_user_review", leadingSilenceTrimmed: groups[0].start, groups, checks: { uniqueHeadingMatches: true, allRecognizedWordsCoveredExactlyOnce: true, contiguousGroupBoundaries: true, cutsInsideMeasuredSilence: true, clipsDecodeSuccessfully: true, durationVerified: true }, generatedAt: new Date().toISOString() }
report.boundaryRule = "100ms_before_group_bell"
for (const [index, group] of groups.entries()) {
  group.bell = boundaries[index].bell
  group.stopsBeforeBell = boundaries[index + 1]?.bell.start ?? null
}
await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2))
await writeFile(`${output}/README.md`, `# B${lesson}: question-group audio pilot\n\n${groups.map(group => `## ${group.questions}\n\n- File: ${group.file}\n- Source interval: ${group.start.toFixed(3)}–${group.end.toFixed(3)} seconds\n- Starts with: ${group.spokenHeading}\n- Last spoken sentence: ${group.lastSpokenSentence}\n- Stops before: ${group.stopsBefore}\n${group.rangeNote ? `- Printed range note: ${group.rangeNote}\n` : ""}`).join("\n")}\nAll recognized words are covered exactly once. Boundaries are in measured silence. This is a local pilot; other lessons and application data are unchanged.\n`)
await writeFile(`reports/workbook-b${lesson}-question-groups-pilot.json`, JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
