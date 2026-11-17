import { createHash } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { canPreviewTextbooks, canReadTextbook, getTextbookPermissions, usesPrivateWorkbookAccess } from "@/lib/textbooks/access"
import { parseListening } from "@/lib/textbooks/listening"

type Params = { params: Promise<{ bookId: string; unitId: string; resourceId: string }> }
const headers = { "Cache-Control": "private, no-store" }
async function authorize(params: Params["params"], clipId: string | null = null) {
  const { bookId, unitId, resourceId } = await params
  const session = await createClient()
  const { data: { user } } = await session.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const
  const db = createAdminClient()
  if (!await canReadTextbook(user.id, bookId)) return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) } as const
  const [unit, resource] = await Promise.all([
    db.from("textbook_units").select("is_published").eq("textbook_id", bookId).eq("id", unitId).maybeSingle(),
    db.from("textbook_resources").select("is_published,metadata,resource_url").eq("id", resourceId).eq("unit_id", unitId).eq("kind", "audio").maybeSingle(),
  ])
  if (!unit.data || !resource.data || ((!unit.data.is_published || !resource.data.is_published) && !await canPreviewTextbooks(user.id) && !await usesPrivateWorkbookAccess(bookId))) return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) } as const
  const listening = parseListening(resource.data.metadata)
  const clip = clipId ? listening?.segments.find(segment => segment.id === clipId) : null
  if (clipId && !clip) return { error: NextResponse.json({ error: "Clip not found" }, { status: 404, headers }) } as const
  const hash = createHash("sha256").update(`audio:${user.id}:${bookId}:${unitId}:${resourceId}${clipId ? `:${clipId}:${listening!.sourceChecksum}` : ""}`).digest("hex")
  const annotationId = `${hash.slice(0,8)}-${hash.slice(8,12)}-4${hash.slice(13,16)}-a${hash.slice(17,20)}-${hash.slice(20,32)}`
  return { user, db, resource: resource.data, annotationId, bookId, unitId, resourceId, listening, clip } as const
}
export async function GET(request: NextRequest, context: Params) {
  const access = await authorize(context.params, request.nextUrl.searchParams.get("clip"))
  if (access.error) return access.error
  if (request.nextUrl.searchParams.get("segments") === "1") {
    const permissions = await getTextbookPermissions(access.user.id)
    const preview = permissions.canViewTranscript
    const base = `/api/textbooks/${access.bookId}/units/${access.unitId}/audio/${access.resourceId}`
    return NextResponse.json({
      status: access.listening?.status || "not_prepared", canReview: permissions.canManageAnswerKeys, canViewTranscript: permissions.canViewTranscript,
      duration: access.listening?.duration || null,
      waveform: access.listening?.waveform || [],
      segments: (access.listening?.segments || []).map(segment => ({
        id: segment.id, index: segment.index, start: segment.start, end: segment.end, clipStart: segment.clipStart, clipEnd: segment.clipEnd,
        text_ko: preview ? segment.text_ko : "", text_vi: preview ? segment.text_vi : "", section: segment.section, role: segment.role,
        questionNumber: segment.questionNumber, questionEndNumber: segment.questionEndNumber, groupInstruction: segment.groupInstruction, uncertain: segment.uncertain, audio_url: `${base}?clip=${segment.id}`,
        pageNumber: segment.pageNumber, anchorY: segment.anchorY,
        waveform: segment.waveform,
      })),
      answerGuide: preview ? access.listening?.answerGuide || [] : [],
    }, { headers })
  }
  if (request.nextUrl.searchParams.get("progress") === "1") {
    const { data, error } = await access.db.from("user_textbook_annotations").select("content").eq("id", access.annotationId).eq("user_id", access.user.id).maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500, headers })
    let seconds = 0
    try { seconds = Number(JSON.parse(data?.content || "{}").seconds) || 0 } catch {}
    return NextResponse.json({ seconds }, { headers })
  }
  const storagePath = access.clip?.audio_path || (access.resource.metadata as { storage_path?: string } | null)?.storage_path
  if (!storagePath) return NextResponse.json({ error: "No audio file" }, { status: 404, headers })
  const { data, error } = await access.db.storage.from("textbooks").createSignedUrl(storagePath, 300)
  if (error || !data) return NextResponse.json({ error: "Audio unavailable" }, { status: 503, headers })
  // Storage serves byte ranges; a short-lived redirect keeps native seeking working.
  return NextResponse.redirect(data.signedUrl, { status: 307, headers })
}
const progressSchema = z.object({ userId: z.string().uuid(), seconds: z.number().min(0).max(86400), duration: z.number().positive().max(86400) }).refine(value => value.seconds <= value.duration + 1)
export async function POST(request: NextRequest, context: Params) {
  const access = await authorize(context.params, request.nextUrl.searchParams.get("clip"))
  if (access.error) return access.error
  const input = progressSchema.safeParse(await request.json().catch(() => null))
  if (!input.success || input.data.userId !== access.user.id) return NextResponse.json({ error: "Invalid audio progress" }, { status: 400, headers })
  const unit = await access.db.from("textbook_units").select("start_page").eq("id", access.unitId).single()
  if (!unit.data) return NextResponse.json({ error: "Not found" }, { status: 404, headers })
  const { error } = await access.db.from("user_textbook_annotations").upsert({
    id: access.annotationId, user_id: access.user.id, textbook_id: access.bookId, page_number: unit.data.start_page,
    kind: "workbook_audio_progress", rect: {}, content: JSON.stringify({ unitId: access.unitId, resourceId: access.resourceId, seconds: input.data.seconds, duration: input.data.duration }), updated_at: new Date().toISOString(),
  }, { onConflict: "id" })
  return NextResponse.json(error ? { error: error.message } : { ok: true }, { status: error ? 500 : 200, headers })
}
