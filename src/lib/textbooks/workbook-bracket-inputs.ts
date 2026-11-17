import type { WorkbookField } from "./workbook"

// Bracket ink measured from the source scans (1440 × 2037).
export function bracketInputRect(imageHash: string, fieldId: string): WorkbookField["rect"] | null {
  let y: number | undefined
  if (imageHash === "d6d05d46e6cf5d89f743f3d9747c4cbab3b45804c81a2286c5a0c6c648cd9a05") {
    y = ({ "p10-f2": 1364, "p10-f3": 1440, "p10-f4": 1515, "p10-f5": 1591, "p10-f6": 1666, "p10-f7": 1741 } as Record<string, number>)[fieldId]
  }
  if (imageHash === "729672f381afda0434bff2dc107d9192f1ff6bdb074589d1b396970813023df3") {
    y = ({ "p11-f1": 191, "p11-f2": 266, "p11-f3": 341, "p11-f4": 417 } as Record<string, number>)[fieldId]
  }
  return y === undefined ? null : { x: 790 / 1440, y: (y - 3) / 2037, width: 222 / 1440, height: 32 / 2037 }
}
