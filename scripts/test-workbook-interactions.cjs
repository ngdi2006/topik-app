const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const zod = require('zod')
const code = ts.transpileModule(fs.readFileSync('src/lib/textbooks/workbook.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
const exportsModel = {}
vm.runInNewContext(code, { exports: exportsModel, require: name => { assert.equal(name, 'zod'); return zod } })
const { parseWorkbookPage, validWorkbookValue, fieldAnswered, fieldTotal, connectMatch, workbookSaveSchema } = exportsModel
const pilot = JSON.parse(fs.readFileSync('tmp/workbook-interactions/eps-topik-2025-workbook-1/0015.json', 'utf8'))

test('matching supports tapping, replacing a target, clearing, and partial progress', () => {
  const field = pilot.fields[0]
  const first = connectMatch(undefined, field.sources[0].id, field.targets[0].id)
  assert.equal(validWorkbookValue(field, first), true)
  assert.equal(fieldAnswered(field, first), 1)
  assert.equal(fieldTotal(field), field.sources.length)
  const replaced = connectMatch(first, field.sources[1].id, field.targets[0].id)
  assert.equal(replaced[field.sources[0].id], undefined)
  assert.equal(replaced[field.sources[1].id], field.targets[0].id)
  assert.equal(Object.keys(connectMatch(replaced, field.sources[1].id, field.targets[0].id)).length, 0)
  assert.equal(validWorkbookValue(field, { invalid_source: field.targets[0].id }), false)
  assert.equal(validWorkbookValue(field, { [field.sources[0].id]: field.targets[0].id, [field.sources[1].id]: field.targets[0].id }), false)
})
test('free Korean text is preserved, blanks are not counted, and choices are validated', () => {
  const field = JSON.parse(fs.readFileSync('tmp/workbook-interactions/eps-topik-2025-workbook-1/0016.json', 'utf8')).fields[0]
  assert.equal(validWorkbookValue(field, '택시 기사'), true)
  assert.equal(fieldAnswered(field, '  '), 0)
  assert.equal(fieldAnswered(field, '택시 기사'), 1)
  assert.equal(fieldAnswered(field, {}), 0)
  const choice = JSON.parse(fs.readFileSync('tmp/workbook-interactions/eps-topik-2025-workbook-1/0019.json', 'utf8')).fields.find(item => item.kind === 'choice')
  assert.equal(validWorkbookValue(choice, choice.options[0].id), true)
  assert.equal(validWorkbookValue(choice, 'invalid'), false)
  assert.equal(fieldAnswered(choice, ''), 0)
})
test('save validation binds the account and rejects oversized or duplicate answers', () => {
  const userId = '00000000-0000-4000-a000-000000000001'
  const answer = { pageNumber: 15, fieldId: 'p15-f1', value: {} }
  assert.equal(workbookSaveSchema.safeParse({ userId, answers: [answer] }).success, true)
  assert.equal(workbookSaveSchema.safeParse({ answers: [answer] }).success, false)
  assert.equal(workbookSaveSchema.safeParse({ userId, answers: [answer, answer] }).success, false)
  assert.equal(workbookSaveSchema.safeParse({ userId, answers: [{ ...answer, value: 'x'.repeat(8001) }] }).success, false)
})
test('all prepared scan pages have valid definitions and in-bounds interaction areas', () => {
  let count = 0; let fields = 0
  for (const volume of [1, 2]) {
    const root = `tmp/workbook-interactions/eps-topik-2025-workbook-${volume}`
    for (const file of fs.readdirSync(root).filter(name => /^\d{4}\.json$/.test(name))) {
      const raw = JSON.parse(fs.readFileSync(`${root}/${file}`, 'utf8'))
      const page = parseWorkbookPage({ workbook: raw })
      assert.ok(page, `${volume}/${file}: invalid schema`)
      assert.equal(new Set(page.fields.map(field => field.id)).size, page.fields.length)
      for (const field of page.fields) {
        for (const rect of [field.rect, ...field.options.map(node => node.rect), ...field.sources.map(node => node.rect), ...field.targets.map(node => node.rect)]) {
          assert.ok(rect.x + rect.width <= 1.000001 && rect.y + rect.height <= 1.000001, `${volume}/${file}/${field.id}: area exceeds image`)
        }
        fields++
      }
      count++
    }
  }
  console.log(`Validated ${count} pages and ${fields} interaction fields`)
  assert.ok(count > 500)
})
