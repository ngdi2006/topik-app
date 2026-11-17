import { readFile, writeFile } from "node:fs/promises"

// Checked against the scanned exercise headings and their continuation pages.
// These are reusable choices, never a field-to-correct-answer mapping.
const groups = [
  { page: 17, from: 1, to: 5, tokens: ["은", "는", "이", "가"], x: .55, y: .215, width: .39 },
  { page: 39, from: 12, to: 16, tokens: ["이", "가", "을", "를"], x: .66, y: .80, width: .29 },
  { page: 40, from: 1, to: 3, tokens: ["이", "가", "을", "를"], x: .64, y: .085, width: .31 },
  { page: 56, from: 21, to: 31, tokens: ["은", "는", "이", "가", "을", "를", "에", "에서"], x: .73, y: .73, width: .22 },
  { page: 57, from: 1, to: 13, tokens: ["은", "는", "이", "가", "을", "를", "에", "에서"], x: .73, y: .10, width: .22 },
  { page: 75, from: 6, to: 22, tokens: ["은", "는", "이", "가", "을", "를", "에", "에서", "께서", "고", "시고"], x: .74, y: .69, width: .21 },
  { page: 82, from: 5, to: 20, tokens: ["은", "는", "이", "가", "을", "를", "에", "에서", "하고", "과", "와", "도"], x: .74, y: .598, width: .21 },
]
const registry = {}, report = { pagesScanned: 0, groups: [], fields: 0 }
for (const volume of [1, 2]) {
  const plan = JSON.parse(await readFile(`tmp/workbook-choice-rows/eps-topik-2025-workbook-${volume}/planned.json`, "utf8"))
  report.pagesScanned += plan.pages.length
  if (volume !== 1) continue
  for (const group of groups) {
    const page = plan.pages.find(page => page.pageNumber === group.page)
    const fieldIds = Array.from({ length: group.to - group.from + 1 }, (_, index) => `p${group.page}-f${index + group.from}`)
    for (const id of fieldIds) if (!page.workbook.fields.some(field => field.id === id && field.kind === "text" && !field.is_context)) throw new Error(`Missing particle field ${id}`)
    const rects = {}
    // The first box on page 75 was a spurious OCR box before 저, shifting the
    // five blanks in question 6. Position each existing ID on a real dot run.
    if (group.page === 75) for (const [index, x] of [.1840278, .2819444, .3798611, .5041667, .6284722].entries()) rects[`p75-f${index + 6}`] = { x, y: .7290773, width: .0555556, height: .0150215 }
    registry[page.workbook.image_hash] = [{ id: `particles-${group.page}`, tokens: group.tokens, fieldIds, rects, x: group.x, y: group.y, width: group.width }]
    report.groups.push({ volume, page: group.page, fieldIds, tokens: group.tokens, continuationOf: group.page === 40 ? 39 : group.page === 57 ? 56 : null })
    report.fields += fieldIds.length
  }
}
await writeFile("src/lib/textbooks/workbook-particle-banks.json", JSON.stringify(registry, null, 2) + "\n")
await writeFile("reports/workbook-particle-bank-audit.json", JSON.stringify(report, null, 2) + "\n")
console.log(JSON.stringify({ pagesScanned: report.pagesScanned, pagesEnabled: report.groups.length, blanks: report.fields }))
