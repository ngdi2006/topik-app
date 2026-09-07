import { readFile, writeFile } from "node:fs/promises"
import process from "node:process"
import dotenv from "dotenv"
import iconv from "iconv-lite"
import { createClient } from "@supabase/supabase-js"

dotenv.config({ path: ".env.local" })
const upload = process.argv.includes("--upload")
const cachedReport = process.argv.find((value) => value.startsWith("--from="))?.slice(7)
const output = "tmp/textbook-vocabulary-import.json"
const sourceCache = "tmp/textbook-vocabulary-source.json"
const checkpoint = "tmp/textbook-vocabulary-checkpoint.json"
const localSources = new Map([
  [1, "E:/file sach 2025 export JSON/2026-08-21_12-45-56-636/raw_document.json"],
  [2, "E:/file sach 2025 export JSON/2026-08-21_12-46-45-764/raw_document.json"],
])
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
if (!url || !serviceKey) throw new Error("Thiếu cấu hình Supabase")
if (!geminiKey && !cachedReport) throw new Error("Thiếu GEMINI_API_KEY hoặc GOOGLE_API_KEY")
const client = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })

function repairText(value) {
  if (!/[ìëê]/.test(value ?? "")) return value ?? ""
  return iconv.decode(iconv.encode(value, "windows-1252"), "utf8")
}

async function loadSource() {
  try {
    const cached = JSON.parse(await readFile(sourceCache, "utf8"))
    if (Array.isArray(cached) && cached.length === 60) {
      console.log(`SOURCE_CACHE=${sourceCache}`)
      return cached.map((unit) => ({ ...unit, pages: unit.pages.map((page) => ({ ...page, ocr_text: repairText(page.ocr_text) })) }))
    }
  } catch {}
  const books = [
    { code: "eps-topik-2025-1", volume: 1, firstUnit: 1, lastUnit: 30, firstPage: 50 },
    { code: "eps-topik-2025-2", volume: 2, firstUnit: 31, lastUnit: 60, firstPage: 16 },
  ]
  const units = []
  for (const book of books) {
    const raw = JSON.parse(await readFile(localSources.get(book.volume), "utf8"))
    const pages = (raw.pages ?? []).map((page) => ({
      page_number: Number(page.pageNumber),
      ocr_text: repairText((page.paragraphs ?? []).map((paragraph) => paragraph.text ?? paragraph.layout?.textAnchor?.content).filter(Boolean).join("\n")),
    }))
    for (let number = book.firstUnit; number <= book.lastUnit; number += 1) {
      const startPage = book.firstPage + (number - book.firstUnit) * 10
      units.push({
        id: `unit-${number}`, book_code: book.code, volume: book.volume, unit_number: number,
        title_ko: null, title_vi: null, start_page: startPage, end_page: startPage + 9,
        pages: pages.filter((page) => page.page_number > startPage && page.page_number <= startPage + 9 && /어휘\s*(?:VOCABULARY)?/i.test(page.ocr_text ?? "")),
      })
    }
  }
  await writeFile(sourceCache, JSON.stringify(units))
  return units
}

async function generate(units) {
  let saved = { completed: [], rows: [] }
  try { saved = JSON.parse(await readFile(checkpoint, "utf8")) } catch {}
  const rows = [...new Map((Array.isArray(saved.rows) ? saved.rows : []).map((row) => [`${row.unit_number}:${row.word_ko}`, row])).values()]
  const completed = new Set(Array.isArray(saved.completed) ? saved.completed : [])
  for (let index = 0; index < units.length; index += 2) {
    const batch = units.slice(index, index + 2).filter((unit) => !completed.has(unit.id))
    if (!batch.length) continue
    const source = batch.map((unit) => ({
      unit_id: unit.id,
      unit_number: unit.unit_number,
      pages: unit.pages.map((page) => ({ page_number: page.page_number, text: page.ocr_text })),
    }))
    const prompt = `Bạn là biên tập viên từ vựng EPS-TOPIK Hàn-Việt. Trích xuất CHỈ các mục từ vựng được in trong phần "어휘 VOCABULARY" từ OCR dưới đây.

Quy tắc bắt buộc:
- Chỉ lấy từ/cụm từ tiếng Hàn xuất hiện nguyên văn trong OCR và có nghĩa tiếng Anh đi kèm.
- Không lấy tiêu đề chủ đề, tên chương, 학습 목표, câu hướng dẫn, câu bài tập, số thứ tự, đáp án hoặc câu hội thoại.
- Nếu một dòng chứa nhiều cặp Hàn-Anh thì tách đúng từng cặp.
- word_ko tối đa 40 ký tự và không phải một câu hoàn chỉnh.
- meaning_vi là bản dịch tiếng Việt tự nhiên, ngắn gọn từ nghĩa tiếng Anh trong OCR.
- part_of_speech chỉ dùng: "danh từ", "động từ", "tính từ", "trạng từ", "cụm từ", hoặc null.
- topic lấy tên chủ đề từ vựng của trang và dịch sang tiếng Việt.
- source_page là trang chứa từ đó.
- example_ko và example_vi: tạo một câu ví dụ ngắn, tự nhiên, phù hợp người học EPS-TOPIK.
- Giữ nguyên unit_id và unit_number. Không tự thêm từ không có trong OCR.

Trả JSON object dạng {"units":[{"unit_id":"...","unit_number":1,"words":[{"word_ko":"...","meaning_vi":"...","part_of_speech":"...","topic":"...","source_page":1,"example_ko":"...","example_vi":"..."}]}]}.
Không dùng markdown.

OCR: ${JSON.stringify(source)}`
    let parsed
    for (let attempt = 1; attempt <= 6; attempt += 1) {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json", temperature: 0.05 } }),
      })
      if (response.ok) {
        const payload = await response.json()
        try {
          parsed = JSON.parse(payload.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}")
          break
        } catch (error) {
          if (attempt === 6) throw error
          console.log(`RETRY attempt=${attempt} reason=invalid-json`)
        }
      } else {
        const details = await response.text()
        if (![429, 500, 502, 503, 504].includes(response.status) || attempt === 6) throw new Error(`Gemini ${response.status}: ${details}`)
        console.log(`RETRY attempt=${attempt} status=${response.status}`)
      }
      const delay = attempt * 10_000
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
    for (const generatedUnit of parsed.units ?? []) {
      const original = batch.find((unit) => unit.id === generatedUnit.unit_id)
      if (!original) continue
      const sourceText = original.pages.map((page) => page.ocr_text ?? "").join("\n")
      const seen = new Set()
      for (const word of generatedUnit.words ?? []) {
        const korean = String(word.word_ko ?? "").trim()
        const meaning = String(word.meaning_vi ?? "").trim()
        if (!korean || !meaning || korean.length > 40 || !sourceText.includes(korean) || seen.has(korean)) continue
        if (!/[가-힣]/.test(korean) || /[.!?]$/.test(korean)) continue
        seen.add(korean)
        rows.push({
          unit_id: original.id, unit_number: original.unit_number, word_ko: korean, meaning_vi: meaning,
          part_of_speech: word.part_of_speech || null, topic: word.topic || null,
          example_ko: word.example_ko || null, example_vi: word.example_vi || null,
          source_page: Number(word.source_page) || original.start_page, source_kind: "import",
          review_status: "reviewed", is_published: true,
          metadata: { generated_by: "gemini-2.5-flash", source_verified: true },
        })
      }
      completed.add(original.id)
    }
    await writeFile(checkpoint, JSON.stringify({ completed: [...completed], rows }, null, 2))
    console.log(`GENERATED ${Math.min(index + 2, units.length)}/${units.length} units · ${rows.length} words`)
  }
  return rows
}

const units = cachedReport ? [] : await loadSource()
const rows = cachedReport ? JSON.parse(await readFile(cachedReport, "utf8")).rows : await generate(units)
const perUnit = Object.entries(rows.reduce((counts, row) => ({ ...counts, [row.unit_number]: (counts[row.unit_number] ?? 0) + 1 }), {}))
  .map(([unit, count]) => ({ unit: Number(unit), count })).sort((a, b) => a.unit - b.unit)
await writeFile(output, JSON.stringify({ generated_at: new Date().toISOString(), rows, per_unit: perUnit }, null, 2))
console.log(`REPORT=${output} WORDS=${rows.length} COVERED_UNITS=${perUnit.length}`)
if (!upload) process.exit(0)

let unitIdByNumber = new Map()
if (rows.some((row) => String(row.unit_id).startsWith("unit-"))) {
  const { data: databaseUnits, error: unitError } = await client.from("textbook_units").select("id,unit_number")
  if (unitError) throw unitError
  unitIdByNumber = new Map((databaseUnits ?? []).map((unit) => [unit.unit_number, unit.id]))
}

for (let index = 0; index < rows.length; index += 100) {
  const payload = rows.slice(index, index + 100).flatMap(({ unit_number, ...row }, offset) => {
    const unitId = String(row.unit_id).startsWith("unit-") ? unitIdByNumber.get(unit_number) : row.unit_id
    return unitId ? [{ ...row, unit_id: unitId, sort_order: index + offset + 1 }] : []
  })
  const { error } = await client.from("textbook_vocabulary").upsert(payload, { onConflict: "unit_id,word_ko" })
  if (error) throw error
  console.log(`UPLOADED ${Math.min(index + 100, rows.length)}/${rows.length}`)
}
