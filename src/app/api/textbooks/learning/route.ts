import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

type BookRow = { id: string; volume: number; edition: string; title_vi: string }
type UnitRow = {
  id: string
  textbook_id: string
  unit_number: number
  title_ko: string | null
  title_vi: string | null
  start_page: number
  end_page: number
}

type ExtractedWord = { word: string; meaning: string; page: number }

const VOCABULARY_MARKER = /(?:어휘|단어)(?:\s+vocabulary)?/i
const SECTION_END = /(?:문법|듣기|읽기|쓰기|대화|문화|발음|grammar|listening|reading|writing|conversation)/i
const NON_WORD_LABELS = new Set([
  "학습 목표", "나라 이름", "직업명", "문화와 정보", "한국의 인사 예절", "한국어 표준교재",
])

function cleanLines(text: string | null) {
  return (text ?? "").split(/\r?\n/).map((line) => line.replace(/\s+/g, " ").trim()).filter(Boolean)
}

function extractVocabulary(text: string | null, page: number): ExtractedWord[] {
  const lines = cleanLines(text)
  const marker = lines.findIndex((line) => VOCABULARY_MARKER.test(line))
  if (marker < 0) return []

  const entries: ExtractedWord[] = []
  for (const line of lines.slice(marker + 1, marker + 50)) {
    if (SECTION_END.test(line)) break
    const match = line.match(/^([가-힣][가-힣\s·/-]{0,24}?)(?:\s{2,}|\s*[:：–—-]\s*)(.+)$/)
    if (!match) continue
    const word = match[1].trim()
    const meaning = match[2].trim()
    if (NON_WORD_LABELS.has(word) || word.split(/\s+/).length > 3 || meaning.length < 2) continue
    if (!/[A-Za-zÀ-ỹ]/.test(meaning)) continue
    entries.push({ word, meaning, page })
  }
  return entries
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const params = new URL(request.url).searchParams
  const type = params.get("type") === "grammar" ? "grammar" : "vocabulary"
  const requestedUnit = params.get("unit")
  const admin = createAdminClient()

  const { data: books, error: bookError } = await admin.from("textbooks")
    .select("id,volume,edition,title_vi").eq("is_published", true).order("volume")
  if (bookError) return NextResponse.json({ error: bookError.message }, { status: 500 })

  const bookRows = (books ?? []) as BookRow[]
  const bookIds = bookRows.map((book) => book.id)
  if (!bookIds.length) return NextResponse.json({ books: [], lessons: [], items: [] })

  let unitQuery = admin.from("textbook_units")
    .select("id,textbook_id,unit_number,title_ko,title_vi,start_page,end_page")
    .in("textbook_id", bookIds).eq("is_published", true).order("unit_number")
  if (requestedUnit) unitQuery = unitQuery.eq("id", requestedUnit)
  const { data: units, error: unitError } = await unitQuery
  if (unitError) return NextResponse.json({ error: unitError.message }, { status: 500 })

  const unitRows = (units ?? []) as UnitRow[]
  const bookById = new Map(bookRows.map((book) => [book.id, book]))
  const unitById = new Map(unitRows.map((unit) => [unit.id, unit]))

  if (type === "grammar") {
    const unitIds = unitRows.map((unit) => unit.id)
    const { data: resources, error } = unitIds.length
      ? await admin.from("textbook_resources").select("id,unit_id,title,metadata,sort_order")
        .in("unit_id", unitIds).eq("kind", "grammar_summary").eq("is_published", true).order("sort_order")
      : { data: [], error: null }
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const items = (resources ?? []).flatMap((resource) => {
      const unit = unitById.get(resource.unit_id)
      if (!unit) return []
      const metadata = resource.metadata as { explanation_vi?: string; analysis_vi?: string; examples?: Array<{ ko: string; vi: string }>; source_page?: number }
      return [{ id: resource.id, title: resource.title, summary: metadata.explanation_vi ?? "", analysis: metadata.analysis_vi ?? "", examples: metadata.examples ?? [], page: metadata.source_page ?? unit.start_page, unit, book: bookById.get(unit.textbook_id) }]
    })
    return NextResponse.json({ books: bookRows, items }, { headers: { "Cache-Control": "private, max-age=300" } })
  }

  const unitIds = unitRows.map((unit) => unit.id)
  const unitChunks = Array.from({ length: Math.ceil(unitIds.length / 15) }, (_, index) => unitIds.slice(index * 15, index * 15 + 15))
  const storedResults = await Promise.all(unitChunks.map((ids) => admin.from("textbook_vocabulary")
    .select("id,unit_id,word_ko,meaning_vi,pronunciation,part_of_speech,topic,example_ko,example_vi,audio_url,image_url,source_page,sort_order")
    .in("unit_id", ids).eq("is_published", true).eq("review_status", "reviewed").order("sort_order")))
  const storedError = storedResults.find((result) => result.error)?.error
  const storedRows = storedResults.flatMap((result) => result.data ?? [])

  if (!storedError && storedRows.length) {
    const progressResult = await admin.from("user_vocabulary_progress")
      .select("vocabulary_id,learning_state,due_at,correct_count,incorrect_count")
      .eq("user_id", user.id).range(0, 9999)
    const progressById = new Map((progressResult.data ?? []).map((item) => [item.vocabulary_id, item]))
    const items = storedRows.flatMap((row) => {
      const unit = unitById.get(row.unit_id)
      if (!unit) return []
      return [{
        id: row.id, word: row.word_ko, meaning: row.meaning_vi, pronunciation: row.pronunciation,
        partOfSpeech: row.part_of_speech, topic: row.topic, exampleKo: row.example_ko,
        exampleVi: row.example_vi, audioUrl: row.audio_url, imageUrl: row.image_url,
        page: row.source_page ?? unit.start_page, unit, book: bookById.get(unit.textbook_id),
        progress: progressById.get(row.id) ?? null,
      }]
    })
    return NextResponse.json({ books: bookRows, lessons: summarizeLessons(unitRows, items, bookById), items, source: "reviewed" }, { headers: { "Cache-Control": "private, max-age=60" } })
  }

  const pageResults = await Promise.all(unitRows.map(async (unit) => ({
    unit,
    result: await admin.from("textbook_pages").select("page_number,ocr_text")
      .eq("textbook_id", unit.textbook_id).gte("page_number", unit.start_page).lte("page_number", unit.end_page).order("page_number"),
  })))
  const failed = pageResults.find(({ result }) => result.error)
  if (failed?.result.error) return NextResponse.json({ error: failed.result.error.message }, { status: 500 })

  const items: Array<Record<string, unknown>> = []
  for (const { unit, result } of pageResults) {
    const seen = new Set<string>()
    for (const page of result.data ?? []) {
      for (const entry of extractVocabulary(page.ocr_text, page.page_number)) {
        const key = entry.word.toLocaleLowerCase("ko")
        if (seen.has(key)) continue
        seen.add(key)
        items.push({ id: `ocr-${unit.id}-${entry.page}-${seen.size}`, ...entry, unit, book: bookById.get(unit.textbook_id), progress: null })
      }
    }
  }
  return NextResponse.json({ books: bookRows, lessons: summarizeLessons(unitRows, items, bookById), items, source: "ocr" }, { headers: { "Cache-Control": "private, max-age=300" } })
}

function summarizeLessons(units: UnitRow[], items: Array<Record<string, unknown>>, books: Map<string, BookRow>) {
  const counts = new Map<string, { total: number; mastered: number; due: number }>()
  for (const item of items) {
    const unit = item.unit as UnitRow
    const progress = item.progress as { learning_state?: string; due_at?: string } | null
    const current = counts.get(unit.id) ?? { total: 0, mastered: 0, due: 0 }
    current.total += 1
    if (progress?.learning_state === "mastered") current.mastered += 1
    if (progress?.due_at && new Date(progress.due_at) <= new Date()) current.due += 1
    counts.set(unit.id, current)
  }
  return units.map((unit) => ({
    ...unit,
    book: books.get(unit.textbook_id),
    ...(counts.get(unit.id) ?? { total: 0, mastered: 0, due: 0 }),
  }))
}
