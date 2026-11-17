import type { WorkbookField } from "./workbook"

// Keep printed inline gaps and tightly packed writing grids in their original
// footprint. Roomier answer lines can grow vertically without moving their text.
export function workbookInputRect(field: WorkbookField, fields: WorkbookField[]): WorkbookField["rect"] {
  const rect = field.rect
  if (rect.width < 0.12 || rect.height > 0.025) return rect
  const center = rect.y + rect.height / 2
  let height = Math.min(rect.height * 1.65, 0.029)
  for (const other of fields) {
    if (other.id === field.id || other.is_context) continue
    const next = other.rect
    if (rect.x >= next.x + next.width || next.x >= rect.x + rect.width) continue
    const distance = next.y >= center ? next.y - center : center - next.y - next.height
    // Existing overlapping OCR areas must not be expanded further.
    height = Math.min(height, Math.max(rect.height, distance * 2 - 0.003))
  }
  height = Math.min(height, center * 2, (1 - center) * 2)
  return { ...rect, y: center - height / 2, height }
}
