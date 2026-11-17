import { spawnSync } from "node:child_process"
import { readFile, writeFile } from "node:fs/promises"
import dotenv from "dotenv"
dotenv.config({ path: ".env.local", quiet: true })
const number = Number(process.argv[2] || 5)
const root = `tmp/workbook-listening/B${number}`
const source = `D:/DATA-E9/MP3-SBT-Q${number <= 30 ? 1 : 2}/FULL/B${number}.mp3`
const file = `${root}/spotcheck-first-minute.mp3`
const cut = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", source, "-t", "60", "-ac", "1", "-ar", "32000", "-b:a", "64k", file], { encoding: "utf8", windowsHide: true })
if (cut.status !== 0) throw new Error("Cannot cut spot-check audio")
const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-transcribe:generateContent", { method: "POST", headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY }, signal: AbortSignal.timeout(180000), body: JSON.stringify({ contents: [{ parts: [{ inlineData: { mimeType: "audio/mp3", data: (await readFile(file)).toString("base64") } }] }], generationConfig: { audioTranscriptionConfig: { languageCodes: ["ko-KR"], mode: "VERBATIM", wordTimestamp: true } } }) })
if (!response.ok) throw new Error(`Spot check API ${response.status}: ${(await response.text()).slice(0, 250)}`)
const result = await response.json()
await writeFile(`${root}/spotcheck-native.json`, JSON.stringify(result, null, 2))
const text = result.candidates?.[0]?.content?.parts?.flatMap(part => part.audioTranscription?.words || []).map(word => word.word).join(" ")
console.log(`B${number} independent native first-minute transcript: ${text}`)
