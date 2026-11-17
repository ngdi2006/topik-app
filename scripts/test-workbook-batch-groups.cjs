const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const crypto = require('node:crypto')
const player = {}
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/components/textbooks/useWorkbookListening.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports: player, require })

test('all 60 installed group plans retain exact cuts, private clip bytes and printed page anchors', () => {
  let total = 0
  for (let lesson = 1; lesson <= 60; lesson++) {
    const root = `tmp/workbook-listening-elevenlabs/B${lesson}/question-groups`
    const report = JSON.parse(fs.readFileSync(`${root}/report.json`, 'utf8'))
    const manifest = JSON.parse(fs.readFileSync(`${root}/web-manifest.json`, 'utf8'))
    assert.ok(report.cutsVerified)
    assert.equal(manifest.segments[0].questionNumber, 1)
    assert.equal(manifest.segments.at(-1).questionEndNumber, 10)
    assert.equal(manifest.segments.at(-1).clipEnd, manifest.duration)
    assert.equal(manifest.transcriptionProvider, 'elevenlabs')
    assert.deepEqual(manifest.answerGuide, [])
    const fields = []
    const pages = [...new Set(manifest.segments.map(segment => segment.pageNumber))]
    for (const page of pages) {
      const book = `eps-topik-2025-workbook-${lesson <= 30 ? 1 : 2}`
      const layout = JSON.parse(fs.readFileSync(`tmp/workbook-interactions/${book}/${String(page).padStart(4, '0')}.json`, 'utf8'))
      fields.push(...layout.fields.map(field => ({ ...field, pageNumber: page })))
    }
    const publicSegments = manifest.segments.map(segment => ({ ...segment, audio_url: `/audio/${lesson}?clip=${segment.id}` }))
    const groups = player.buildCanonicalGroups(fields, publicSegments)
    assert.equal(groups.length, manifest.segments.length, `B${lesson}: missing button due to old OCR fields`)
    for (const [index, segment] of manifest.segments.entries()) {
      assert.equal(groups[index].startTime, segment.clipStart)
      assert.equal(groups[index].endTime, segment.clipEnd)
      assert.equal(groups[index].pageNumber, segment.pageNumber)
      assert.equal(groups[index].y, segment.anchorY)
      assert.equal(groups[index].audioUrl, publicSegments[index].audio_url)
      if (index) {
        assert.equal(segment.clipStart, manifest.segments[index-1].clipEnd)
        assert.equal(segment.questionNumber, manifest.segments[index-1].questionEndNumber+1)
      }
      const bytes = fs.readFileSync(`${root}/${report.groups[index].file}`)
      assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), report.groups[index].clipChecksum)
      assert.match(segment.audio_path, /audio-groups-elevenlabs/)
      total++
    }
  }
  assert.equal(total, 255)
})

test('shared or omitted question fields keep the ten visually checked group buttons on the correct pages', () => {
  for (const [lesson, startQ, page] of [[8,5,79],[14,8,133],[18,3,166],[24,3,217],[25,9,227],[36,7,57],[37,7,66],[38,7,75],[42,7,107],[48,9,160]]) {
    const manifest = JSON.parse(fs.readFileSync(`tmp/workbook-listening-elevenlabs/B${lesson}/question-groups/web-manifest.json`, 'utf8'))
    assert.equal(manifest.segments.find(segment => segment.questionNumber === startQ).pageNumber, page)
  }
})
