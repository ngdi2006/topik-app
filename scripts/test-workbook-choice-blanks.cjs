const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const model = {}
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/textbooks/workbook.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: model, require })
const removed = []
let pages = 0, choices = 0, retainedText = 0
for (const volume of [1, 2]) {
  const plan = JSON.parse(fs.readFileSync(`tmp/workbook-choice-rows/eps-topik-2025-workbook-${volume}/planned.json`))
  for (const page of plan.pages) {
    pages++
    const fields = model.workbookAnswerFields(page.workbook.fields)
    assert.deepEqual(model.workbookAnswerFields(fields), fields, 'Normalization must be idempotent')
    const parsed = model.parseWorkbookPage({ workbook: page.workbook })
    assert.deepEqual(parsed.fields.map(f => f.id), fields.map(f => f.id))
    for (const field of page.workbook.fields) {
      if (!fields.includes(field)) {
        assert.equal(field.kind, 'text')
        removed.push({ volume, page: page.pageNumber, id: field.id, label: field.label })
      } else if (field.kind === 'choice') choices++
      else if (field.kind === 'text') retainedText++
    }
    if (volume === 1 && page.pageNumber === 95) {
      assert.equal(fields.some(f => f.id === 'p95-f4'), false)
      assert.equal(fields.find(f => f.id === 'p95-f5').options.length, 4)
    }
    if (volume === 1 && page.pageNumber === 35) {
      for (const id of ['p35-f6', 'p35-f7', 'p35-f8']) assert.equal(fields.some(f => f.id === id), false)
      for (const id of ['p35-f9', 'p35-f10', 'p35-f11']) assert.equal(fields.find(f => f.id === id).options.length, 4)
      assert.equal(fields.filter(f => f.section === 'grammar').length, 5, 'Keep inline grammar choices')
    }
  }
}
assert.equal(removed.length, 22)
assert.ok(retainedText > 100)
fs.writeFileSync('reports/workbook-choice-blank-audit.json', JSON.stringify({ pages, choices, retainedText, removed }, null, 2))
console.log(`PASS ${pages} pages: removed ${removed.length} duplicate choice blanks; retained ${choices} choices and ${retainedText} text fields`)
