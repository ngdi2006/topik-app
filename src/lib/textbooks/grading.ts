import type { WorkbookField, WorkbookPage, WorkbookValue } from "./workbook"
import { choiceAnswerText, inlineChoiceGroups, inlineChoiceSelection, validWorkbookValue } from "./workbook"

export type GradeItem = { pageNumber: number; fieldId: string; sourceId?: string; section: WorkbookField["section"]; label: string; status: "correct" | "incorrect" | "unanswered" | "ungraded"; expected?: string }
export type WorkbookGrade = { items: GradeItem[]; correct: number; total: number; incorrect: number; unanswered: number; ungraded: number }
export const isAutoGradedField = (field: WorkbookField) => field.kind === "choice" && (field.section === "reading" || field.section === "listening")
export function summarizeGrade(items: GradeItem[]): WorkbookGrade {
  return { items, correct: items.filter(item => item.status === "correct").length, total: items.filter(item => item.status !== "ungraded").length, incorrect: items.filter(item => item.status === "incorrect").length, unanswered: items.filter(item => item.status === "unanswered").length, ungraded: items.filter(item => item.status === "ungraded").length }
}
export function sameProtectedAnswerKeys(before: WorkbookPage, after: WorkbookPage) {
  const canonical = (value: unknown): unknown => Array.isArray(value) ? value.map(canonical) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)])) : value
  const keys = (page: WorkbookPage) => page.fields.filter(field => field.answer_key).map(field => ({ id: field.id, key: field.answer_key, kind: field.kind, label: field.label, section: field.section, allow_shared_targets: field.allow_shared_targets, is_context: field.is_context, options: field.options.map(node => ({ id: node.id, label: node.label, is_context: node.is_context })), sources: field.sources.map(node => ({ id: node.id, label: node.label, is_context: node.is_context })), targets: field.targets.map(node => ({ id: node.id, label: node.label, is_context: node.is_context })) })).sort((a, b) => a.id.localeCompare(b.id))
  return JSON.stringify(canonical(keys(before))) === JSON.stringify(canonical(keys(after)))
}
const normalize = (value: string) => value.normalize("NFKC").trim().replace(/\s+/gu, " ").replace(/[.!?。！？]+$/u, "").toLocaleLowerCase("ko")
export function validAnswerKey(field: WorkbookField) {
  const key = field.answer_key
  if (!key) return true
  if (field.kind === "text") return typeof key.value === "string" && !!normalize(key.value)
  if (field.kind === "choice") {
    const groups = inlineChoiceGroups(field)
    if (groups.length) return typeof key.value === "object" && key.value !== null && validWorkbookValue(field, key.value) && groups.every(group => !!inlineChoiceSelection(field, key.value)[group.id])
    return typeof key.value === "string" && field.options.some(option => option.id === key.value)
  }
  if (typeof key.value !== "object" || key.value === null) return false
  const pairs = key.value
  const sources = field.sources.filter(node => !node.is_context)
  const values = Object.values(key.value)
  return Object.keys(pairs).length === sources.length && sources.every(source => field.targets.some(target => !target.is_context && target.id === pairs[source.id])) && (field.allow_shared_targets || new Set(values).size === values.length)
}
export function gradeWorkbook(pages: { pageNumber: number; workbook: WorkbookPage | null }[], answers: Record<string, WorkbookValue>): WorkbookGrade {
  const items: GradeItem[] = []
  for (const page of pages) for (const field of page.workbook?.fields ?? []) {
    if (field.is_context) continue
    const key = field.answer_key
    const reviewed = key?.status === "reviewed" && validAnswerKey(field)
    const actual = answers[`${page.pageNumber}:${field.id}`]
    const base = { pageNumber: page.pageNumber, fieldId: field.id, section: field.section, label: field.label }
    if (field.kind === "match") {
      for (const source of field.sources.filter(node => !node.is_context)) {
        const expected = reviewed && typeof key?.value === "object" ? key.value[source.id] : undefined
        const selected = typeof actual === "object" && actual !== null ? actual[source.id] : undefined
        items.push({ ...base, sourceId: source.id, label: `${field.label} · ${source.label}`, status: !reviewed ? "ungraded" : !selected ? "unanswered" : selected === expected ? "correct" : "incorrect", expected: expected ? field.targets.find(node => node.id === expected)?.label : undefined })
      }
    } else if (inlineChoiceGroups(field).length) {
      const groups = inlineChoiceGroups(field)
      const selected = inlineChoiceSelection(field, actual)
      const expected = inlineChoiceSelection(field, key?.value)
      const complete = groups.every(group => !!selected[group.id])
      const correct = complete && groups.every(group => selected[group.id] === expected[group.id])
      items.push({ ...base, status: !reviewed ? "ungraded" : !complete ? "unanswered" : correct ? "correct" : "incorrect", expected: reviewed ? choiceAnswerText(field, key?.value) : undefined })
    } else {
      const selected = typeof actual === "string" ? actual : ""
      const expected = typeof key?.value === "string" ? key.value : ""
      const correct = field.kind === "choice" ? selected === expected : [expected, ...(key?.alternatives ?? [])].some(value => normalize(value) === normalize(selected))
      items.push({ ...base, status: !reviewed ? "ungraded" : !selected.trim() ? "unanswered" : correct ? "correct" : "incorrect", expected: reviewed ? field.kind === "choice" ? field.options.find(option => option.id === expected)?.label : expected : undefined })
    }
  }
  return summarizeGrade(items)
}
