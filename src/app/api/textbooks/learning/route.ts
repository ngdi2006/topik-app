import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

type UnitRow = {
  id: string
  textbook_id: string
  unit_number: number
  title_vi: string | null
  start_page: number
  end_page: number
}

const cleanLines = (text: string | null) => (text ?? "")
  .split(/\r?\n/)
  .map((line) => line.replace(/\s+/g, " ").trim())
  .filter(Boolean)

function extractVocabulary(text: string | null) {
  const lines = cleanLines(text)
  const marker = lines.findIndex((line) => /(?:어휘|단어)\s*(?:vocabulary)?/i.test(line))
  if (marker < 0) return []

  return lines.slice(marker + 1, marker + 45).flatMap((line) => {
    if (/(?:문법|grammar|듣기|listening|읽기|reading|대화|conversation)/i.test(line)) return []
    const match = line.match(/^([가-힣][가-힣\s·/-]{0,28}?)(?:\s{2,}|\s*[:：–—-]\s*)(.+)$/)
    const word = (match?.[1] ?? line).trim()
    if (!/[가-힣]/.test(word) || word.length > 30 || word.split(/\s+/).length > 4) return []
    if (/^[가-힣\s]+[.!?]$/.test(word)) return []
    return [{ word, meaning: match?.[2]?.trim() || "" }]
  })
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const type = new URL(request.url).searchParams.get("type") === "grammar" ? "grammar" : "vocabulary"
  const admin = createAdminClient()
  const { data: books, error: bookError } = await admin.from("textbooks").select("id,volume,edition,title_vi").eq("is_published", true).order("volume")
  if (bookError) return NextResponse.json({ error: bookError.message }, { status: 500 })
  const bookIds = (books ?? []).map((book) => book.id)
  if (!bookIds.length) return NextResponse.json({ books: [], items: [] })

  const { data: units, error: unitError } = await admin.from("textbook_units").select("id,textbook_id,unit_number,title_vi,start_page,end_page").in("textbook_id", bookIds).eq("is_published", true).order("unit_number")
  if (unitError) return NextResponse.json({ error: unitError.message }, { status: 500 })
  const unitRows = (units ?? []) as UnitRow[]
  const bookById = new Map((books ?? []).map((book) => [book.id, book]))

  if (type === "grammar") {
    const unitIds = unitRows.map((unit) => unit.id)
    const { data: resources, error } = unitIds.length
      ? await admin.from("textbook_resources").select("id,unit_id,title,metadata,sort_order").in("unit_id", unitIds).eq("kind", "grammar_summary").eq("is_published", true).order("sort_order")
      : { data: [], error: null }
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const unitById = new Map(unitRows.map((unit) => [unit.id, unit]))
    const items = (resources ?? []).flatMap((resource) => {
      const unit = unitById.get(resource.unit_id)
      if (!unit) return []
      const book = bookById.get(unit.textbook_id)
      const metadata = resource.metadata as { explanation_vi?: string; analysis_vi?: string; examples?: Array<{ ko: string; vi: string }>; source_page?: number }
      return [{ id: resource.id, title: resource.title, summary: metadata.explanation_vi ?? "", analysis: metadata.analysis_vi ?? "", examples: metadata.examples ?? [], page: metadata.source_page ?? unit.start_page, unit, book }]
    })
    return NextResponse.json({ books, items }, { headers: { "Cache-Control": "private, max-age=300" } })
  }

  const pageResults = await Promise.all(unitRows.map(async (unit) => ({
    unit,
    result: await admin.from("textbook_pages").select("page_number,ocr_text").eq("textbook_id", unit.textbook_id).gte("page_number", unit.start_page).lte("page_number", unit.end_page).order("page_number"),
  })))
  const failedResult = pageResults.find(({ result }) => result.error)
  if (failedResult?.result.error) return NextResponse.json({ error: failedResult.result.error.message }, { status: 500 })

  const items: Array<Record<string, unknown>> = []
  for (const { unit, result } of pageResults) {
    const seen = new Set<string>()
    for (const page of result.data ?? []) {
      for (const entry of extractVocabulary(page.ocr_text)) {
        const key = entry.word.toLocaleLowerCase("ko")
        if (seen.has(key)) continue
        seen.add(key)
        items.push({ id: `${unit.id}-${page.page_number}-${items.length}`, ...entry, page: page.page_number, unit, book: bookById.get(unit.textbook_id) })
      }
    }
  }
  return NextResponse.json({ books, items }, { headers: { "Cache-Control": "private, max-age=300" } })
}
