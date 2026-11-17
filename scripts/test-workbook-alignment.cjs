const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')

test('aligned layouts preserve question/option IDs and saved-answer keys', () => {
  let count = 0
  for (const volume of [1, 2]) {
    const root = `tmp/workbook-alignment/eps-topik-2025-workbook-${volume}`
    const source = JSON.parse(fs.readFileSync(`${root}/source.json`, 'utf8'))
    const aligned = JSON.parse(fs.readFileSync(`${root}/aligned.json`, 'utf8'))
    assert.equal(aligned.pages.length, source.rows.length)
    assert.equal(aligned.summary.unanchoredChoices, 0)
    for (const page of aligned.pages) {
      const before = source.rows.find(row => row.page_number === page.pageNumber).ocr_payload.workbook
      assert.deepEqual(page.workbook.fields.map(field => field.id), before.fields.map(field => field.id))
      for (const [index, field] of page.workbook.fields.entries()) {
        for (const key of ['options', 'sources', 'targets']) assert.deepEqual(field[key].map(node => node.id), before.fields[index][key].map(node => node.id))
        if (field.kind === 'choice' && !field.is_context) {
          for (const option of field.options) if (option.presentation !== 'word') {
            assert.ok(option.rect.width * 1440 <= 42, `${volume}/${page.pageNumber}/${field.id}: choice spreads over text`)
            assert.ok(option.rect.height * 1864 <= 42)
          }
        }
      }
      count++
    }
  }
  assert.equal(count, 543)
})

test('bank lesson blanks and multiline answers match actual dotted rows', () => {
  const data = JSON.parse(fs.readFileSync('tmp/workbook-alignment/eps-topik-2025-workbook-1/aligned.json', 'utf8'))
  const p212 = data.pages.find(page => page.pageNumber === 212).workbook.fields
  const p213 = data.pages.find(page => page.pageNumber === 213).workbook.fields
  const first = p212[0].rect
  assert.ok(first.x > 0.45 && first.x < 0.47)
  assert.ok(first.y > 0.12 && first.y < 0.14)
  assert.ok(p213[2].rect.y > 0.44)
  assert.ok(p213[2].rect.height > 0.035)
  assert.ok(p213[3].rect.y > p213[2].rect.y + p213[2].rect.height)
})
