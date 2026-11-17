import { createHash } from "node:crypto"
import { readFile, writeFile, mkdir } from "node:fs/promises"
import dotenv from "dotenv"
import { createClient } from "@supabase/supabase-js"

dotenv.config({ path: ".env.local", quiet: true })
const args = process.argv.slice(2)
const option = (name, fallback) => args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : fallback
const first = Number(option("from", 1)); const last = Number(option("to", 60))
const upload = args.includes("--upload")
const db = upload ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } }) : null
const toc = JSON.parse(await readFile("reports/workbook-toc.json", "utf8"))
const report = []
const check = result => { if (result.error) throw result.error; return result.data }
for (let number = first; number <= last; number++) {
  const root = `tmp/workbook-listening/B${number}`
  let manifest
  try { manifest = JSON.parse(await readFile(`${root}/manifest.json`, "utf8")) } catch { report.push({ lesson: number, status: "waiting_for_transcript" }); continue }
  const volume = number <= 30 ? 1 : 2
  const code = `eps-topik-2025-workbook-${volume}`
  const bookToc = toc.books.find(book => book.code === code)
  const unitToc = bookToc.units.find(unit => unit.unit_number === number)
  const pages = []; const fields = []
  for (let page = unitToc.start_page; page <= unitToc.end_page; page++) {
    const layout = JSON.parse(await readFile(`tmp/workbook-interactions/${code}/${String(page).padStart(4, "0")}.json`, "utf8"))
    if (page < unitToc.end_page - 2 && !layout.fields.some(field => field.section === "listening")) continue
    const exercises = layout.fields.filter(field => !field.is_context)
    fields.push(...exercises.map(field => ({ ...field, pageNumber: page })))
    pages.push({ number: page, image: await readFile(`tmp/workbooks-2025/${code}/${String(page).padStart(4, "0")}.webp`) })
  }
  const sourceHash = createHash("sha256").update(JSON.stringify({ checksum: manifest.sourceChecksum, segments: manifest.segments.map(segment => ({ id: segment.id, text_ko: segment.text_ko })), fields })).digest("hex")
  let answerGuide
  try { const cached = JSON.parse(await readFile(`${root}/answer-guide.json`, "utf8")); if (cached.sourceHash === sourceHash) answerGuide = cached.answerGuide } catch {}
  if (!answerGuide) {
    const prompt = `Prepare a DRAFT Vietnamese answer guide for EPS-TOPIK workbook lesson ${number}. Use only the actual recorded Korean transcript and scanned exercises attached, not general guesses. Return JSON {"answers":[{"fieldId":"exact provided ID", "pageNumber":0,"optionIds":[],"answerText":"", "explanation_vi":"", "evidenceSegmentIds":[], "confidence":"high|medium|low|insufficient"}]}.
Answer only exercises that clearly correspond to the recording. Questions restart numbering in separate sections. Do not match by number alone: compare section, wording, picture and answer options. Use exact option IDs from the field; only one ID for a single-choice question. For a blank use answerText. Include accurate Vietnamese reasoning grounded in the audio; cite exact segment IDs supporting it. A translation alone is not an answer key. If the audio does not contain enough evidence or the scan/transcript is unclear, return no option IDs/answerText and confidence insufficient with explanation. Never assert a correct answer without explicit supporting audio. Exclude instructional examples, context tables and fields outside the matching listening exercise. Do not invent audio or transcripts. All outputs will be marked draft for admin review.
Fields (coordinates refer to the corresponding full page image): ${JSON.stringify(fields)}.
Recorded transcript: ${JSON.stringify(manifest.segments.map(segment => ({ id: segment.id, ko: segment.text_ko, vi: segment.text_vi, section: segment.section, role: segment.role, question: segment.questionNumber, uncertain: segment.uncertain })))}`
    const parts = [{ text: prompt }]
    for (const page of pages) parts.push({ text: `Scanned PDF page ${page.number}` }, { inlineData: { mimeType: "image/webp", data: page.image.toString("base64") } })
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent", { method: "POST", headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY }, signal: AbortSignal.timeout(240000), body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseMimeType: "application/json", temperature: 0, maxOutputTokens: 16000 } }) })
    if (!response.ok) throw new Error(`Answer guide API ${response.status}`)
    const data = await response.json()
    const output = JSON.parse(data.candidates?.[0]?.content?.parts?.filter(part => !part.thought).map(part => part.text || "").join(""))
    const proposed = Array.isArray(output) ? output : output.answers
    if (!Array.isArray(proposed)) throw new Error("Invalid answer guide")
    const seen = new Set()
    answerGuide = proposed.map(answer => {
      const field = fields.find(field => field.id === answer.fieldId && field.pageNumber === answer.pageNumber)
      if (!field || seen.has(field.id)) { console.log(`B${number}: omitted ungrounded/duplicate guide reference ${answer.fieldId}`); return null }
      seen.add(field.id)
      const options = Array.isArray(answer.optionIds) ? answer.optionIds.map(String) : []
      const evidence = Array.isArray(answer.evidenceSegmentIds) ? answer.evidenceSegmentIds.filter(id => manifest.segments.some(segment => segment.id === id)) : []
      const invalidOptions = options.some(id => !field.options.some(option => option.id === id)) || (field.kind === "choice" && options.length > 1)
      const missingEvidence = (options.length || answer.answerText) && !evidence.length
      const invalidEvidence = evidence.length !== (answer.evidenceSegmentIds?.length || 0)
      const confidence = !invalidOptions && !missingEvidence && !invalidEvidence && ["high", "medium", "low"].includes(answer.confidence) ? answer.confidence : "insufficient"
      if (invalidOptions || missingEvidence || invalidEvidence) console.log(`B${number}: ${field.id} marked insufficient; no unsupported answer published`)
      return { fieldId: field.id, pageNumber: field.pageNumber, optionIds: confidence === "insufficient" ? [] : options, answerText: confidence === "insufficient" ? "" : String(answer.answerText || ""), explanation_vi: invalidOptions || missingEvidence || invalidEvidence ? "Chưa có dẫn chứng âm thanh hợp lệ để xác định đáp án. Cần đối chiếu lại câu hỏi và bản nghe." : String(answer.explanation_vi || "Chưa đủ dữ liệu để xác định đáp án."), evidenceSegmentIds: evidence, status: "draft", confidence }
    }).filter(Boolean)
    await writeFile(`${root}/answer-guide.json`, JSON.stringify({ sourceHash, answerGuide }, null, 2))
  }
  manifest.answerGuide = answerGuide
  await writeFile(`${root}/manifest.json`, JSON.stringify(manifest, null, 2))
  if (db) {
    const book = check(await db.from("textbooks").select("id,is_published").eq("code", code).single())
    if (book.is_published) throw new Error("Keep workbook in preview while reviewing guides")
    const unit = check(await db.from("textbook_units").select("id").eq("textbook_id", book.id).eq("unit_number", number).single())
    const resources = check(await db.from("textbook_resources").select("id,metadata").eq("unit_id", unit.id).eq("kind", "audio"))
    const resource = resources.find(resource => resource.metadata?.source_file === `B${number}.mp3`)
    if (!resource?.metadata?.listening) throw new Error("Upload verified clips before adding the guide")
    const reviewed = resource.metadata.listening.answerGuide?.filter(guide => guide.status === "reviewed") || []
    const merged = [...reviewed, ...answerGuide.filter(guide => !reviewed.some(existing => existing.fieldId === guide.fieldId))]
    check(await db.from("textbook_resources").update({ metadata: { ...resource.metadata, listening: { ...resource.metadata.listening, answerGuide: merged } } }).eq("id", resource.id))
  }
  console.log(`B${number}: ${answerGuide.length} draft guide entries grounded in audio and scan`)
  report.push({ lesson: number, status: upload ? "draft_uploaded" : "draft_prepared", entries: answerGuide.length })
}
await mkdir("reports", { recursive: true })
await writeFile("reports/workbook-listening-answer-guides.json", JSON.stringify({ generatedAt: new Date().toISOString(), lessons: report }, null, 2))
