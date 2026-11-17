// These three pages were checked directly against the original scan.
import { readFile, writeFile } from "node:fs/promises"
import { createHash } from "node:crypto"

function choice(page, index, label, section, points) {
  const options = points.map(([x, y], i) => ({ id: String(i + 1), label: String(i + 1), rect: { x: x / 900 - 0.011, y: y / 1165 - 0.01, width: 0.025, height: 0.021 } }))
  const x = Math.min(...options.map(node => node.rect.x)); const y = Math.min(...options.map(node => node.rect.y))
  return { id: `p${page}-f${index}`, kind: "choice", label, section, rect: { x, y, width: Math.max(...options.map(node => node.rect.x + node.rect.width)) - x, height: Math.max(...options.map(node => node.rect.y + node.rect.height)) - y }, options, sources: [], targets: [] }
}
const repairs = [
  [1, 252, [
    ["Đọc hiểu · Câu 10", "reading", [[155,156],[506,156],[155,201],[506,201]]],
    ["Nghe hiểu · Câu 1", "listening", [[521,399],[521,445],[521,491],[521,537]]],
    ["Nghe hiểu · Câu 2", "listening", [[521,582],[521,628],[521,674],[521,720]]],
    ["Nghe hiểu · Câu 3", "listening", [[521,766],[521,812],[521,857],[521,903]]],
    ["Nghe hiểu · Câu 4", "listening", [[154,995],[332,995],[509,995],[688,995]]],
    ["Nghe hiểu · Câu 5", "listening", [[154,1040],[332,1040],[509,1040],[688,1040]]],
  ]],
  [2, 142, [
    ["Nghe hiểu · Câu 6", "listening", [[150,109],[511,109],[150,155],[511,155]]],
    ["Nghe hiểu · Câu 7", "listening", [[150,247],[332,247],[509,247],[656,247]]],
    ["Nghe hiểu · Câu 8", "listening", [[150,293],[332,293],[509,293],[656,293]]],
    ["Nghe hiểu · Câu 9", "listening", [[150,432],[511,432],[150,477],[511,477]]],
    ["Nghe hiểu · Câu 10", "listening", [[150,567],[511,567],[150,615],[511,615]]],
  ]],
  [2, 260, [
    ["Đọc hiểu · Câu 10", "reading", [[155,340],[332,340],[508,340],[684,340]]],
    ["Nghe hiểu · Câu 1", "listening", [[507,593],[507,628],[507,663],[507,698]]],
    ["Nghe hiểu · Câu 2", "listening", [[507,733],[507,768],[507,803],[507,838]]],
    ["Nghe hiểu · Câu 3", "listening", [[230,1067],[410,1067],[590,1067],[768,1067]]],
  ]],
]
for (const [volume, page, definitions] of repairs) {
  const code = `eps-topik-2025-workbook-${volume}`
  const name = String(page).padStart(4, "0")
  const bytes = await readFile(`tmp/workbooks-2025/${code}/${name}.webp`)
  const result = { version: 1, coordinate_format: "yxyx_v2", source: "manual_scan_review", review_status: "reviewed", image_hash: createHash("sha256").update(bytes).digest("hex"), fields: definitions.map(([label, section, points], index) => choice(page, index + 1, label, section, points)), note: "Verified directly against scanned page" }
  await writeFile(`tmp/workbook-interactions/${code}/${name}.json`, JSON.stringify(result, null, 2))
  console.log(`${code} ${page}: ${result.fields.length} manually verified choice fields`)
}
