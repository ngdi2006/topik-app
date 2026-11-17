import { readFile, writeFile, mkdir } from "node:fs/promises"
import { createHash } from "node:crypto"
import dotenv from "dotenv"
import { createClient } from "@supabase/supabase-js"

dotenv.config({ path: ".env.local", quiet: true })
const options = new Map(process.argv.slice(2).map((value, index, all) => value.startsWith("--") ? [value.slice(2), all[index + 1]] : []).filter(pair => pair.length))
const volume = Number(options.get("volume") || 1)
const first = Number(options.get("from") || 1)
const last = Number(options.get("to") || (volume === 1 ? 273 : 270))
const upload = process.argv.includes("--upload")
const concurrency = Number(options.get("concurrency") || 3)
const code = `eps-topik-2025-workbook-${volume}`
const root = `tmp/workbook-interactions/${code}`
await mkdir(root, { recursive: true })
const db = upload ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } }) : null
const book = db ? await db.from("textbooks").select("id,is_published").eq("code", code).single() : null
if (book?.error) throw book.error
if (book?.data.is_published) throw new Error("Workbooks must remain private during preparation")
const prompt = `You are locating interactive exercise widgets ON a Korean EPS-TOPIK scanned workbook page, not solving questions. Return JSON only: {"fields":[...],"note":""}.
Coordinates: every box is [ymin,xmin,ymax,xmax] on a 0..1000 scale relative to the ENTIRE supplied image. Locate precisely, do not guess regular grids. Do not include logos, watermarks, page numbers, headings, explanations, completed examples marked 보기, answer keys, word banks, or passage text as questions.
Each field: {"id":"f1", "kind":"text|choice|match", "section":"vocabulary|grammar|writing|reading|listening|intro", "label":"short Vietnamese question label including printed question number and a brief identifying Korean phrase", "box":[ymin,xmin,ymax,xmax], "options":[], "sources":[], "targets":[]}.
TEXT: one field for EACH distinct blank to fill, dotted/underlined answer space, missing particle, table empty cell, composition area or translation answer. The box must cover only the answer space, not existing sentence text. For a single multi-line answer make one taller box spanning the answer lines. Small missing particles need a box just large enough to type Korean. For handwriting practice provide a text field for each row, not each identical repeated tracing cell. Do not create fields over completed examples or filled printed data.
CHOICE: one field per multiple-choice question (reading AND listening). options are {"id":"1", "label":"printed option text, or option number if image", "box":[...]}; box of each option encloses its printed circled number/check box or selection marker, NOT the entire sentence/image. Include all options, exactly one selected value per question. Field box encloses question options. Never make each option a separate question. If options start on the previous page, return only self-contained widgets visible here.
MATCH: one field per matching exercise group. sources and targets are each [{"id":"1", "label":"printed number or concise Korean identifying text", "box":[...]}]. Source boxes enclose actual source images/text, target boxes enclose target words/images. Exclude the already-drawn example from BOTH lists. Include every unanswered source and candidate target, even a target used by the example if it is still selectable for real questions. Source and target boxes are used to place connection buttons on the outer edges, so accurately enclose each item. Match field box encloses all pairs. No fabricated correct answers.
If a reading/listening question expects free text use text. Identify listening by 듣기 or listening instructions. Questions can appear in multiple sections on ONE page; locate every exercise throughout the page, including continuation questions at top and bottom. If genuinely no exercises return fields:[]. Do not transcribe full passages. Do not produce correct answers or audio URLs. Maximum 80 fields. IDs f1,f2,... in reading order.`

function rect(box) {
  if (!Array.isArray(box) || box.length !== 4 || box.some(n => !Number.isFinite(n))) throw new Error("Invalid box")
  const [ymin, xmin, ymax, xmax] = box.map(n => n / 1000)
  const x = xmin; const y = ymin; const width = xmax - xmin; const height = ymax - ymin
  if (x < 0 || y < 0 || width <= 0 || height <= 0 || x >= 1 || y >= 1) throw new Error("Out-of-bounds box")
  return { x, y, width: Math.min(width, 1 - x), height: Math.min(height, 1 - y) }
}
function normalize(raw, number, hash) {
  if (!Array.isArray(raw.fields) || raw.fields.length > 80) throw new Error("Invalid field count")
  const fields = raw.fields.map((field, index) => {
    if (!["text", "choice", "match"].includes(field.kind)) throw new Error("Invalid kind")
    const nodes = key => (field[key] || []).map((node, i) => ({ id: String(node.id ?? i + 1), label: String(node.label || i + 1).slice(0, 300), rect: rect(node.box) }))
    const options = field.kind === "choice" ? nodes("options") : []
    const sources = field.kind === "match" ? nodes("sources") : []
    const targets = field.kind === "match" ? nodes("targets") : []
    const endpoints = [...options, ...sources, ...targets]
    const union = endpoints.length ? { x: Math.min(...endpoints.map(node => node.rect.x)), y: Math.min(...endpoints.map(node => node.rect.y)) } : null
    const bounds = union ? { ...union, width: Math.max(...endpoints.map(node => node.rect.x + node.rect.width)) - union.x, height: Math.max(...endpoints.map(node => node.rect.y + node.rect.height)) - union.y } : rect(field.box)
    const result = { id: `p${number}-f${index + 1}`, kind: field.kind, section: ["vocabulary", "grammar", "writing", "reading", "listening", "intro"].includes(field.section) ? field.section : "writing", label: String(field.label || `Câu ${index + 1}`).slice(0, 300), rect: bounds, options, sources, targets }
    if (result.kind === "choice" && result.options.length < 2) throw new Error("Choice missing options")
    if (result.kind === "match" && (!result.sources.length || !result.targets.length)) throw new Error("Matching missing endpoints")
    for (const key of ["options", "sources", "targets"]) if (new Set(result[key].map(node => node.id)).size !== result[key].length) throw new Error("Duplicate endpoint IDs")
    return result
  })
  return { version: 1, coordinate_format: "yxyx_v2", source: "scan_vision", review_status: "needs_review", image_hash: hash, fields, note: String(raw.note || "").slice(0, 500) }
}
async function extract(number) {
  const cache = `${root}/${String(number).padStart(4, "0")}.json`
  const input = await readFile(`tmp/workbooks-2025/${code}/${String(number).padStart(4, "0")}.webp`)
  const hash = createHash("sha256").update(input).digest("hex")
  let result
  try { result = JSON.parse(await readFile(cache, "utf8")); if (result.image_hash !== hash || result.coordinate_format !== "yxyx_v2") result = null } catch {}
  if (!result) {
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`, {
          method: "POST", headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
          signal: AbortSignal.timeout(180000),
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt + (number <= 12 && volume === 1 ? " IMPORTANT: This is introductory Hangul practice. Create ONE text widget per character ROW or whole writing exercise, never one per repeated tracing cell. All section values should be intro." : "") + " IMPORTANT: box is [TOP_Y,LEFT_X,BOTTOM_Y,RIGHT_X], NOT x/y/width/height. BOTTOM_Y must be greater than TOP_Y and RIGHT_X must be greater than LEFT_X. Example: [200,100,215,300]." }, { inlineData: { mimeType: "image/webp", data: input.toString("base64") } }] }], generationConfig: { responseMimeType: "application/json", temperature: 0, thinkingConfig: { thinkingBudget: 0 }, maxOutputTokens: 16000 } }),
        })
        if (!response.ok) throw new Error(`Vision API ${response.status}: ${(await response.text()).slice(0, 400)}`)
        const payload = await response.json()
        const raw = payload.candidates?.[0]?.content?.parts?.filter(part => !part.thought).map(part => part.text || "").join("")
        await writeFile(`${root}/${String(number).padStart(4, "0")}.raw.txt`, raw)
        result = normalize(JSON.parse(raw), number, hash)
        await writeFile(cache, JSON.stringify(result, null, 2))
        break
      } catch (error) {
        if (attempt === 3) throw error
        console.log(`${code} page ${number}: retry ${attempt + 1} ${error.message.slice(0, 120)}`)
        await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)))
      }
    }
  }
  if (db) {
    const existing = await db.from("textbook_pages").select("ocr_payload").eq("textbook_id", book.data.id).eq("page_number", number).single()
    if (existing.error) throw existing.error
    if (existing.data.ocr_payload?.workbook?.review_status === "reviewed" || existing.data.ocr_payload?.workbook?.alignment_version >= 2) {
      console.log(`${code} page ${number}: keeping admin-reviewed layout`)
      return existing.data.ocr_payload.workbook
    }
    const saved = await db.from("textbook_pages").update({ ocr_payload: { ...existing.data.ocr_payload, workbook: result } }).eq("textbook_id", book.data.id).eq("page_number", number)
    if (saved.error) throw saved.error
  }
  console.log(`${code} page ${number}/${last}: ${result.fields.length} fields${db ? " saved" : ""}`)
  return result
}
let cursor = first
const errors = []
await Promise.all(Array.from({ length: concurrency }, async () => {
  while (cursor <= last) {
    const number = cursor++
    try { await extract(number) } catch (error) { errors.push({ page: number, message: error.message }); console.error(`FAILED ${code} page ${number}: ${error.message}`) }
  }
}))
await writeFile(`${root}/run-report.json`, JSON.stringify({ generatedAt: new Date().toISOString(), first, last, errors }, null, 2))
if (errors.length) process.exitCode = 1
