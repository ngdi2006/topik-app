import type { WorkbookField } from "./workbook"

// Measured on the 1440 × 1864 source image. The original OCR progressively
// shifted rows 4–7 upward; keep stable answer IDs and correct only geometry.
const page35: Record<string, [number, number, number, number]> = {
  "p35-f1:1": [301, 307, 84, 29], "p35-f1:2": [397, 307, 83, 29],
  "p35-f2:1": [496, 380, 25, 29], "p35-f2:2": [535, 380, 24, 29],
  "p35-f3:1": [429, 454, 24, 29], "p35-f3:2": [469, 454, 24, 29],
  "p35-f4:1": [402, 528, 80, 29], "p35-f4:2": [502, 528, 52, 29],
  "p35-f5:1": [492, 601, 25, 29], "p35-f5:2": [536, 601, 24, 29],
}

export function wordChoiceRect(imageHash: string, fieldId: string, option: WorkbookField["options"][number]) {
  if (imageHash === "0bd7a97dc203eae1e84656412e1a697dd925f4d446b370a9ddfd124e9d3fc74f" && option.presentation === "word") {
    const x = fieldId === "p40-f11" ? ({ "1": 305, "2": 345, "3": 650, "4": 690 } as Record<string, number>)[option.id] : Math.round(option.rect.x * 1440) - 5
    return { x: x / 1440, y: (Math.round(option.rect.y * 1864) + 1) / 1864, width: 25 / 1440, height: 29 / 1864 }
  }
  if (imageHash !== "f3d463b0cf52a4ecfab65aa4d423f7351d628065e082385e0821a4d08480c063" || option.presentation !== "word") return null
  const box = page35[`${fieldId}:${option.id}`]
  return box ? { x: box[0] / 1440, y: box[1] / 1864, width: box[2] / 1440, height: box[3] / 1864 } : null
}
