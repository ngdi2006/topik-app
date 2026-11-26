import type { WorkbookField, WorkbookValue } from "./workbook"
import registry from "./workbook-error-corrections.json"

export type CorrectionSpec = {
  sentence: string
  label: string
  tokens: { text: string; index: number; rect: WorkbookField["rect"] }[]
  answerRect: WorkbookField["rect"] | null
}
export const correctionExercises = registry as Record<string, Record<string, CorrectionSpec>>
const correctionFields = new Set(Object.values(correctionExercises).flatMap(fields =>
  Object.entries(fields).map(([id, spec]) => `${id}|${spec.label}`)))

export function isErrorCorrection(field: WorkbookField) {
  return field.kind === "text" && (/틀린.*(?:고치|바르)/u.test(field.label) || correctionFields.has(`${field.id}|${field.label}`))
}

export function correctionText(value: WorkbookValue | undefined) {
  return typeof value === "string" ? value : value?.correction ?? ""
}

export function correctionMarks(value: WorkbookValue | undefined) {
  return typeof value === "object" && value !== null ? value.marks ?? "" : ""
}

