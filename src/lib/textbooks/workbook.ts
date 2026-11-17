import { z } from "zod"

const rectSchema = z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1), width: z.number().positive().max(1), height: z.number().positive().max(1) })
const nodeSchema = z.object({ id: z.string().min(1).max(80), label: z.string().max(300), rect: rectSchema, hit_rect: rectSchema.optional(), port: z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) }).optional(), is_context: z.boolean().optional(), presentation: z.enum(["marker", "word"]).optional() })
export const workbookFieldSchema = z.object({
  id: z.string().min(1).max(80), kind: z.enum(["text", "choice", "match"]),
  section: z.enum(["vocabulary", "grammar", "writing", "reading", "listening", "intro"]),
  label: z.string().max(300), rect: rectSchema,
  options: z.array(nodeSchema).max(30), sources: z.array(nodeSchema).max(50), targets: z.array(nodeSchema).max(50),
  is_context: z.boolean().optional(),
  allow_shared_targets: z.boolean().optional(),
  answer_key: z.object({ status: z.enum(["draft", "reviewed"]), value: z.union([z.string().max(8000), z.record(z.string().max(80), z.string().max(80))]), alternatives: z.array(z.string().max(8000)).max(30).optional() }).optional(),
})
export const workbookPageSchema = z.object({
  version: z.literal(1), source: z.string(), review_status: z.enum(["needs_review", "reviewed"]),
  image_hash: z.string(), fields: z.array(workbookFieldSchema).max(80), note: z.string().optional(),
})
export type WorkbookField = z.infer<typeof workbookFieldSchema>
export type WorkbookPage = z.infer<typeof workbookPageSchema>
export function workbookAnswerFields(fields: WorkbookField[]) {
  const questionNumber = (label: string) => label.match(/^\s*\[?(\d+)\s*[.\]\s]/u)?.[1]
  const choices = fields.filter(field => field.kind === "choice" && !field.is_context && field.options.length === 4 && field.options.every(option => /^[1-4]$/.test(option.id) && option.presentation !== "word"))
  return fields.filter(field => field.kind !== "text" || !choices.some(choice => choice.section === field.section && (choice.label === field.label || (questionNumber(field.label) !== undefined && questionNumber(choice.label) === questionNumber(field.label)))))
}
// SVG coordinates use a 1000 x 1000 viewBox. Aligned ports need a sideways
// bow, otherwise their connections merge into one vertical line.
export function matchingCurvePath(start: { x: number; y: number }, end: { x: number; y: number }, lane = 0) {
  const sx = start.x * 1000, sy = start.y * 1000, ex = end.x * 1000, ey = end.y * 1000
  if (Math.abs(ex - sx) < 60) {
    const bend = Math.min(sx, ex) - Math.min(100, 42 + Math.abs(ey - sy) * 0.18 + lane * 8)
    const controlX = Math.max(8, bend)
    return `M ${sx} ${sy} C ${controlX} ${sy}, ${controlX} ${ey}, ${ex} ${ey}`
  }
  const reach = (ex - sx) * 0.45
  const bow = Math.abs(ey - sy) < 20 ? 24 + lane * 4 : 0
  return `M ${sx} ${sy} C ${sx + reach} ${sy - bow}, ${ex - reach} ${ey - bow}, ${ex} ${ey}`
}
export function matchingPort(field: WorkbookField, node: WorkbookField["sources"][number], side: "source" | "target") {
  if (field.id === "p85-f1") return { x: side === "source" ? 0.46 : 0.55, y: node.rect.y + node.rect.height / 2 }
  if (node.port) return node.port
  const sources = field.sources.filter(n => !n.is_context), targets = field.targets.filter(n => !n.is_context)
  const x = side === "source" ? Math.max(...sources.map(n => n.rect.x + n.rect.width)) + 0.02 : Math.min(...targets.map(n => n.rect.x)) - 0.02
  return { x: Math.max(0.015, Math.min(0.985, x)), y: node.rect.y + node.rect.height / 2 }
}
export function matchingContentRect(field: WorkbookField, node: WorkbookField["sources"][number], side: "source" | "target") {
  // The OCR box for the first flag only covered its central emblem.
  if (field.id === "p15-f1" && side === "source" && node.id === "1") return { x: 0.19, y: 0.421, width: 0.177, height: 0.078 }
  // Sentence OCR included the image's letter label, collapsing both port columns.
  if (field.id === "p85-f1" && side === "source") return { ...node.rect, width: 0.335 }
  if (field.id === "p85-f1" && side === "target") return { x: 0.515, y: node.rect.y - 0.008, width: 0.39, height: node.rect.height + 0.016 }
  return node.hit_rect ?? node.rect
}
export function choiceHitRect(option: WorkbookField["options"][number], fields: WorkbookField[]) {
  if (option.hit_rect) return option.hit_rect
  if (option.presentation === "word") return option.rect
  const r = option.rect
  const next = fields.filter(f => f.kind === "choice" && !f.is_context).flatMap(f => f.options).filter(n => n !== option && n.rect.x > r.x && Math.abs(n.rect.y - r.y) < Math.max(r.height, n.rect.height) * 0.6)
  const right = Math.min(0.96, ...next.map(n => n.rect.x - 0.008), r.x + Math.max(r.width, Math.min(0.36, option.label.length * 0.014 + 0.035)))
  return { x: r.x, y: Math.max(0, r.y - 0.002), width: Math.max(r.width, right - r.x), height: Math.min(1 - r.y, r.height + 0.004) }
}
export type WorkbookValue = string | Record<string, string>
export type WorkbookAnswer = { pageNumber: number; fieldId: string; value: WorkbookValue; updatedAt: string }
export type WorkbookUnitProgress = { unitId: string; answered: number; total: number }
export const workbookValueSchema = z.union([z.string().max(8000), z.record(z.string().max(80), z.string().max(80)).refine(value => Object.keys(value).length <= 50)])
export const workbookSaveSchema = z.object({ userId: z.string().uuid(), answers: z.array(z.object({ pageNumber: z.number().int().positive(), fieldId: z.string().min(1).max(80), value: workbookValueSchema })).min(1).max(50) }).refine(body => new Set(body.answers.map(answer => answerKey(answer.pageNumber, answer.fieldId))).size === body.answers.length)

export function parseWorkbookPage(payload: unknown): WorkbookPage | null {
  const parsed = workbookPageSchema.safeParse((payload as { workbook?: unknown } | null)?.workbook)
  return parsed.success ? { ...parsed.data, fields: workbookAnswerFields(parsed.data.fields) } : null
}
export function validWorkbookValue(field: WorkbookField, value: WorkbookValue) {
  if (field.is_context) return false
  if (field.kind === "text") return typeof value === "string"
  if (field.kind === "choice") return typeof value === "string" && (value === "" || field.options.some(option => option.id === value))
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false
  const targets = new Set(Object.values(value))
  return (field.allow_shared_targets || targets.size === Object.values(value).length) && Object.entries(value).every(([source, target]) => field.sources.some(node => node.id === source) && field.targets.some(node => node.id === target))
}
export function fieldTotal(field: WorkbookField) { return field.is_context ? 0 : field.kind === "match" ? field.sources.filter(n => !n.is_context).length : 1 }
export function fieldAnswered(field: WorkbookField, value: WorkbookValue | undefined) {
  if (value === undefined || !validWorkbookValue(field, value)) return 0
  return field.kind === "match" ? Object.entries(value).filter(([source, target]) => field.sources.some(n => n.id === source && !n.is_context) && field.targets.some(n => n.id === target && !n.is_context)).length : typeof value === "string" && value.trim() ? 1 : 0
}
export function answerKey(pageNumber: number, fieldId: string) { return `${pageNumber}:${fieldId}` }
export function connectMatch(current: WorkbookValue | undefined, source: string, target: string, allowSharedTargets = false): Record<string, string> {
  const result = typeof current === "object" && current !== null ? { ...current } : {}
  if (result[source] === target) { delete result[source]; return result }
  if (!allowSharedTargets) for (const id of Object.keys(result)) if (result[id] === target) delete result[id]
  result[source] = target
  return result
}
export const sectionLabels: Record<WorkbookField["section"], string> = {
  vocabulary: "Từ vựng", grammar: "Ngữ pháp", writing: "Viết", reading: "Đọc hiểu", listening: "Nghe hiểu", intro: "Mở đầu",
}
