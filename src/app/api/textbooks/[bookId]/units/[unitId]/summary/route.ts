import { canReadTextbook, canPreviewTextbooks, usesPrivateWorkbookAccess } from "@/lib/textbooks/access"
import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

const cleanLines = (text: string | null) => (text ?? "").split(/\r?\n/).map((line) => line.replace(/\s+/g, " ").trim()).filter(Boolean)

function grammarFromPage(text: string | null, pageNumber: number) {
  const lines = cleanLines(text)
  const marker = lines.findIndex((line) => /문법\s*grammar/i.test(line))
  if (marker < 0) return null
  const titleIndex = lines.findIndex((line, index) => index > marker && !/^\d+$/.test(line) && !/^(grammar|문법)$/i.test(line))
  if (titleIndex < 0) return null
  const title = lines[titleIndex]
  const explanation: string[] = []
  for (const line of lines.slice(titleIndex + 1)) {
    if (/^(예|example|\d+[.)]|\[보기\]|대화|conversation)/i.test(line)) break
    if (/[가-힣]/.test(line)) explanation.push(line)
    if (explanation.join(" ").length >= 180) break
  }
  return { title, summary: explanation.join(" "), page_number: pageNumber }
}

export async function GET(_request: Request, context: { params: Promise<{ bookId: string; unitId: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { bookId, unitId } = await context.params
  const admin = createAdminClient()
  const preview = await canPreviewTextbooks(user.id)
  const { data: unit } = await admin.from("textbook_units").select("id,start_page,end_page,is_published").eq("id", unitId).eq("textbook_id", bookId).maybeSingle()
  if (!unit || !await canReadTextbook(user.id, bookId) || (!unit.is_published && !await canPreviewTextbooks(user.id))) return NextResponse.json({ error: "Unit not found" }, { status: 404 })
  let resourceQuery = admin.from("textbook_resources").select("id,kind,title,resource_url,metadata,sort_order").eq("unit_id", unitId).in("kind", ["audio", "grammar_summary"]).order("sort_order")
  if (!preview && !await usesPrivateWorkbookAccess(bookId)) resourceQuery = resourceQuery.eq("is_published", true)
  const [{ data: pages, error }, { data: resources, error: resourceError }] = await Promise.all([
    admin.from("textbook_pages").select("page_number,ocr_text").eq("textbook_id", bookId).gte("page_number", unit.start_page).lte("page_number", unit.end_page).order("page_number"),
    resourceQuery,
  ])
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (resourceError) return NextResponse.json({ error: resourceError.message }, { status: 500 })
  const generatedGrammar = (resources ?? []).filter((resource) => resource.kind === "grammar_summary").map((resource) => {
    const metadata = resource.metadata as { explanation_vi?: string; analysis_vi?: string; examples?: Array<{ ko: string; vi: string }>; source_page?: number }
    return { title: resource.title, summary: metadata.explanation_vi ?? "", analysis_vi: metadata.analysis_vi ?? "", examples: metadata.examples ?? [], page_number: metadata.source_page ?? unit.start_page }
  })
  const grammar = generatedGrammar.length ? generatedGrammar : (pages ?? []).map((page) => grammarFromPage(page.ocr_text, page.page_number)).filter((item): item is NonNullable<typeof item> => Boolean(item)).map((item) => ({ ...item, analysis_vi: "", examples: [] }))
  const listeningPage = (pages ?? []).find((page) => /듣기\s*listening/i.test(page.ocr_text ?? ""))
  const listeningLines = cleanLines(listeningPage?.ocr_text ?? null)
  const listeningMarker = listeningLines.findIndex((line) => /듣기\s*listening/i.test(line))
  const track = listeningMarker >= 0 ? listeningLines.slice(listeningMarker + 1).find((line) => /^\d{1,4}$/.test(line)) ?? null : null
  const audio = (resources ?? []).filter(resource => resource.kind === "audio").map(resource => ({
    id: resource.id, title: resource.title,
    page_number: (() => { const page=(resource.metadata as {source_page?:number}|null)?.source_page; return Number.isInteger(page)&&Number(page)>=unit.start_page&&Number(page)<=unit.end_page?page:null })(),
    resource_url: (resource.metadata as { storage_path?: string } | null)?.storage_path ? `/api/textbooks/${bookId}/units/${unitId}/audio/${resource.id}` : resource.resource_url,
  }))
  return NextResponse.json({ grammar, audio, listening: listeningPage ? { page_number: listeningPage.page_number, track } : null }, { headers: { "Cache-Control": "no-store, max-age=0" } })
}
