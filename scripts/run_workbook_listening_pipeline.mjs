import { spawn } from "node:child_process"
import { mkdir, writeFile } from "node:fs/promises"

const args = process.argv.slice(2)
const option = (name, fallback) => args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : fallback
const first = Number(option("from", 1)); const last = Number(option("to", 60))
const concurrency = Number(option("concurrency", 3))
const results = []; let cursor = first
await mkdir("reports", { recursive: true })
async function run(script, number, extra = []) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [script, "--from", String(number), "--to", String(number), ...extra], { stdio: "inherit", windowsHide: true })
      child.once("error", reject); child.once("exit", resolve)
    })
    if (code === 0) return
    if (attempt === 2) throw new Error(`${script} failed for B${number}`)
    console.log(`B${number}: retrying stage ${script}, attempt ${attempt + 2}`)
    await new Promise(resolve => setTimeout(resolve, 3000))
  }
}
await Promise.all(Array.from({ length: concurrency }, async () => {
  while (cursor <= last) {
    const number = cursor++
    try {
      await run("scripts/transcribe_workbook_flash.mjs", number, ["--concurrency", "1"])
      await run("scripts/prepare_workbook_listening.mjs", number, ["--cut", "--upload"])
      await run("scripts/generate_workbook_listening_guides.mjs", number, ["--upload"])
      results.push({ lesson: number, status: "complete_draft" })
      console.log(`COMPLETE B${number}: bilingual transcript, verified MP3 clips and draft answer guide`)
    } catch (error) { results.push({ lesson: number, status: "failed", error: error.message }); console.error(`FAILED B${number}: ${error.message}`) }
    await writeFile(`reports/workbook-listening-pipeline-${first}-${last}.json`, JSON.stringify({ updatedAt: new Date().toISOString(), first, last, results: [...results].sort((a,b) => a.lesson-b.lesson) }, null, 2))
  }
}))
if (results.some(result => result.status === "failed")) process.exitCode = 1
