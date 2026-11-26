import type { WorkbookField } from "./workbook"

// Keep printed inline gaps and tightly packed writing grids in their original
// footprint. Roomier answer lines can grow vertically without moving their text.
export function workbookInputRect(field: WorkbookField, fields: WorkbookField[], imageHash?: string): WorkbookField["rect"] {
  // The calendar exercise has one OCR box spanning two answer rows and a
  // displaced final box. Keep corrections tied to the verified scan.
  if (imageHash === "3bf493baffe9a7abc91502812723c54db0c5b55f53ab155955edaeaabae59157") {
    const row = ["p46-f1", "p46-f2", "p46-f3", "p46-f4", "p46-f5"].indexOf(field.id)
    if (row >= 0) {
      const centers = [0.63894855, 0.67811165, 0.71781115, 0.75697425, 0.79613735]
      return { x: 0.5354167, y: centers[row] - 0.0124, width: 0.3756944, height: 0.0248 }
    }
  }
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
