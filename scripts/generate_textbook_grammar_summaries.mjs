import dotenv from "dotenv"
import { createClient } from "@supabase/supabase-js"

dotenv.config({ path: ".env.local" })
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
if (!geminiKey) throw new Error("Thiếu GEMINI_API_KEY")

const lines = (text) => (text ?? "").split(/\r?\n/).map((line) => line.replace(/\s+/g, " ").trim()).filter(Boolean)
function extractGrammar(text, pageNumber) {
  const values = lines(text)
  const marker = values.findIndex((line) => /문법\s*grammar/i.test(line))
  if (marker < 0) return null
  const titleIndex = values.findIndex((line, index) => index > marker && !/^\d+$/.test(line) && !/^(grammar|문법)$/i.test(line))
  if (titleIndex < 0) return null
  const source = []
  for (const line of values.slice(titleIndex + 1)) {
    if (/^(예|example|\d+[.)]|\[보기\]|대화|conversation)/i.test(line)) break
    source.push(line)
    if (source.join(" ").length > 500) break
  }
  return { pattern: values[titleIndex], source: source.join(" "), page_number: pageNumber }
}

async function enrich(batch) {
  const prompt = `Bạn là biên tập viên giáo trình tiếng Hàn EPS-TOPIK cho người Việt. Với từng cấu trúc dưới đây, hãy trả về JSON array đúng số lượng và giữ nguyên unit_number, page_number, pattern. Mỗi item có:
- explanation_vi: giải thích tiếng Việt chính xác, súc tích, tối đa 2 câu.
- analysis_vi: phân tích cách gắn cấu trúc, patchim/không patchim hoặc sắc thái sử dụng; tối đa 2 câu.
- examples: đúng 2 ví dụ thực tế, mỗi ví dụ {ko, vi}; câu Hàn tự nhiên, phù hợp người lao động EPS-TOPIK.
Không chép phần từ vựng, bài tập hoặc tiếng Anh. Không dùng markdown.
Dữ liệu: ${JSON.stringify(batch)}`
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json", temperature: 0.15 } }) })
  if (!response.ok) throw new Error(`Gemini ${response.status}: ${await response.text()}`)
  const payload = await response.json()
  return JSON.parse(payload.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]")
}

const { data: books, error: booksError } = await supabase.from("textbooks").select("id,code,textbook_units(id,unit_number,start_page,end_page)").order("volume")
if (booksError) throw booksError
const collected = []
for (const book of books ?? []) {
  for (const unit of book.textbook_units ?? []) {
    const { data: pages, error } = await supabase.from("textbook_pages").select("page_number,ocr_text").eq("textbook_id", book.id).gte("page_number", unit.start_page).lte("page_number", unit.end_page).order("page_number")
    if (error) throw error
    const grammar = (pages ?? []).map((page) => extractGrammar(page.ocr_text, page.page_number)).filter(Boolean)
    for (const item of grammar) collected.push({ book_code: book.code, unit_id: unit.id, unit_number: unit.unit_number, ...item })
  }
}

console.log(`Tìm thấy ${collected.length} cấu trúc ngữ pháp.`)
const generated = []
for (let index = 0; index < collected.length; index += 10) {
  const batch = collected.slice(index, index + 10)
  generated.push(...await enrich(batch.map(({ unit_id, book_code, ...item }) => item)))
  console.log(`Gemini: ${Math.min(index + 10, collected.length)}/${collected.length}`)
}

const sourceByKey = new Map(collected.map((item) => [`${item.unit_number}:${item.page_number}:${item.pattern}`, item]))
const unitIds = [...new Set(collected.map((item) => item.unit_id))]
if (unitIds.length) {
  const { error } = await supabase.from("textbook_resources").delete().in("unit_id", unitIds).eq("kind", "grammar_summary")
  if (error) throw error
}
const rows = generated.flatMap((item, index) => {
  const source = sourceByKey.get(`${item.unit_number}:${item.page_number}:${item.pattern}`)
  if (!source) return []
  return [{ unit_id: source.unit_id, kind: "grammar_summary", title: source.pattern, metadata: { explanation_vi: item.explanation_vi, analysis_vi: item.analysis_vi, examples: Array.isArray(item.examples) ? item.examples.slice(0, 2) : [], source_page: source.page_number, generated_by: "gemini-2.5-flash" }, sort_order: index, is_published: true }]
})
for (let index = 0; index < rows.length; index += 100) {
  const { error } = await supabase.from("textbook_resources").insert(rows.slice(index, index + 100))
  if (error) throw error
}
console.log(`GRAMMAR_SUMMARIES_OK ${rows.length}`)
