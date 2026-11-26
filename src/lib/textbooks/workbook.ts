import { z } from "zod"
import { correctionText, isErrorCorrection } from "./error-correction"

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
type InlineChoiceField = { kind: string; label: string; options: { id: string; label: string; presentation?: string }[] }
export function inlineChoiceGroups(field: InlineChoiceField) {
  if (field.kind !== "choice" || field.options.some(option => option.presentation && option.presentation !== "word")) return []
  const brackets = Array.from(field.label.matchAll(/[（(]([^()（）]*[/／][^()（）]*)[)）]/gu))
  if (brackets.length < 2) return []
  let offset = 0
  const groups = brackets.map((match, index) => {
    const labels = match[1].split(/[/／]/u).map(label => label.trim())
    const options = field.options.slice(offset, offset + labels.length)
    offset += labels.length
    return { id: `g${index + 1}`, label: `Ngoặc ${index + 1}`, options, valid: options.length === labels.length && options.every((option, i) => option.label.trim() === labels[i]) }
  })
  return offset === field.options.length && groups.every(group => group.valid) ? groups : []
}
export function inlineChoiceSelection(field: InlineChoiceField, value: WorkbookValue | undefined): Record<string, string> {
  const groups = inlineChoiceGroups(field)
  if (typeof value === "object" && value !== null) return value
  const group = groups.find(group => group.options.some(option => option.id === value))
  return group && typeof value === "string" ? { [group.id]: value } : {}
}
export function choiceOptionSelected(field: WorkbookField, value: WorkbookValue | undefined, optionId: string) {
  return inlineChoiceGroups(field).length ? Object.values(inlineChoiceSelection(field, value)).includes(optionId) : value === optionId
}
export function selectChoiceOption(field: WorkbookField, value: WorkbookValue | undefined, optionId: string): WorkbookValue {
  const groups = inlineChoiceGroups(field)
  if (!groups.length) return value === optionId ? "" : optionId
  const group = groups.find(group => group.options.some(option => option.id === optionId))
  const next = { ...inlineChoiceSelection(field, value) }
  if (group) {
    if (next[group.id] === optionId) delete next[group.id]
    else next[group.id] = optionId
  }
  return next
}
export function choiceAnswerText(field: InlineChoiceField, value: WorkbookValue | undefined) {
  const groups = inlineChoiceGroups(field)
  if (!groups.length) return typeof value === "string" ? field.options.find(option => option.id === value)?.label ?? "" : ""
  const selected = inlineChoiceSelection(field, value)
  return groups.map(group => `${group.label}: ${group.options.find(option => option.id === selected[group.id])?.label || "Chưa trả lời"}`).join(" · ")
}
export function workbookAnswerFields(fields: WorkbookField[]) {
  const questionNumber = (label: string) => label.match(/^\s*\[?(\d+)\s*[.\]\s]/u)?.[1]
  const passageMarkers = (label: string): string[] => label.match(/[\u3260-\u327b\u24d0-\u24e9]/gu) ?? []
  const choices = fields.filter(field => field.kind === "choice" && !field.is_context && field.options.length === 4 && field.options.every(option => /^[1-4]$/.test(option.id) && option.presentation !== "word"))
  return fields.filter(field => field.kind !== "text" || !choices.some(choice => choice.section === field.section && (
    choice.label === field.label ||
    (questionNumber(field.label) !== undefined && questionNumber(choice.label) === questionNumber(field.label)) ||
    // A shared passage can contain unnumbered gaps (㉠, ㉡, …), while
    // the actual answers belong to the numbered multiple-choice questions.
    (field.rect.y < choice.rect.y && passageMarkers(field.label).some(marker => passageMarkers(choice.label).includes(marker)))
  )))
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
  if (field.id === "p10-f1" && field.sources.map(source => source.label).join("|") === "박|있다|낮|술|집") {
    // Centers of the printed black dots, measured on the 1440 × 2037 scan.
    const sourceY = [479.5, 630, 780.5, 931.5, 1076.5]
    const targetY = [284.5, 437.5, 515.5, 593.5, 666, 738, 816.5, 894.5, 967.5, 1040.5, 1112.5]
    const index = (side === "source" ? field.sources : field.targets).findIndex(item => item.id === node.id)
    const y = (side === "source" ? sourceY : targetY)[index]
    if (y !== undefined) return { x: (side === "source" ? 381.5 : 773.5) / 1440, y: y / 2037 }
  }
  if (field.id === "p3-f7" && field.sources.map(source => source.label).join("|") === "오이|오|아이|이") {
    const rect = matchingContentRect(field, node, side)
    return { x: side === "source" ? 0.25 : 0.57, y: rect.y + rect.height / 2 }
  }
  if (field.id === "p85-f1") return { x: side === "source" ? 0.46 : 0.55, y: node.rect.y + node.rect.height / 2 }
  if (node.port) return node.port
  const sources = field.sources.filter(n => !n.is_context), targets = field.targets.filter(n => !n.is_context)
  const x = side === "source" ? Math.max(...sources.map(n => n.rect.x + n.rect.width)) + 0.02 : Math.min(...targets.map(n => n.rect.x)) - 0.02
  return { x: Math.max(0.015, Math.min(0.985, x)), y: node.rect.y + node.rect.height / 2 }
}
export function matchingContentRect(field: WorkbookField, node: WorkbookField["sources"][number], side: "source" | "target") {
  if (field.id === "p10-f1" && side === "source" && field.sources.map(source => source.label).join("|") === "박|있다|낮|술|집") {
    const y = [479.5, 630, 780.5, 931.5, 1076.5][field.sources.findIndex(item => item.id === node.id)]
    if (y !== undefined) return { x: 260 / 1440, y: (y - 20) / 2037, width: (node.label.length > 1 ? 65 : 40) / 1440, height: 40 / 2037 }
  }
  if (field.id === "p3-f7" && field.sources.map(source => source.label).join("|") === "오이|오|아이|이") {
    if (side === "source") return { ...node.rect, width: node.label.length > 1 ? 0.052 : 0.028 }
    if (node.id === "4") return { x: 0.60, y: 0.65, width: 0.10, height: 0.075 }
  }
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
const correctionValueSchema = z.object({
  correction: z.string().max(8000),
  marks: z.string().max(2000).regex(/^(?:\d+(?:,\d+)*)?$/),
}).strict()
export const workbookValueSchema = z.union([
  z.string().max(8000),
  correctionValueSchema,
  z.record(z.string().max(80), z.string().max(80)).refine(value => Object.keys(value).length <= 50),
])
export const workbookSaveSchema = z.object({ userId: z.string().uuid(), answers: z.array(z.object({ pageNumber: z.number().int().positive(), fieldId: z.string().min(1).max(80), value: workbookValueSchema })).min(1).max(50) }).refine(body => new Set(body.answers.map(answer => answerKey(answer.pageNumber, answer.fieldId))).size === body.answers.length)

export function parseWorkbookPage(payload: unknown): WorkbookPage | null {
  const parsed = workbookPageSchema.safeParse((payload as { workbook?: unknown } | null)?.workbook)
  return parsed.success ? { ...parsed.data, fields: workbookAnswerFields(parsed.data.fields) } : null
}
export function validWorkbookValue(field: WorkbookField, value: WorkbookValue) {
  if (field.is_context) return false
  if (field.kind === "text") return typeof value === "string" || (isErrorCorrection(field) && correctionValueSchema.safeParse(value).success)
  if (field.kind === "choice") {
    if (typeof value === "string") return value === "" || field.options.some(option => option.id === value)
    const groups = inlineChoiceGroups(field)
    return groups.length > 1 && value !== null && !Array.isArray(value) && Object.entries(value).every(([id, optionId]) => groups.some(group => group.id === id && group.options.some(option => option.id === optionId)))
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false
  const targets = new Set(Object.values(value))
  return (field.allow_shared_targets || targets.size === Object.values(value).length) && Object.entries(value).every(([source, target]) => field.sources.some(node => node.id === source) && field.targets.some(node => node.id === target))
}
export function fieldTotal(field: WorkbookField) { return field.is_context ? 0 : field.kind === "match" ? field.sources.filter(n => !n.is_context).length : 1 }
export function fieldAnswered(field: WorkbookField, value: WorkbookValue | undefined) {
  if (value === undefined || !validWorkbookValue(field, value)) return 0
  if (isErrorCorrection(field)) return correctionText(value).trim() ? 1 : 0
  const groups = inlineChoiceGroups(field)
  if (groups.length) { const selected = inlineChoiceSelection(field, value); return groups.every(group => !!selected[group.id]) ? 1 : 0 }
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
