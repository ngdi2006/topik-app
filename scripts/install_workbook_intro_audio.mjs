import { readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import ts from 'typescript'
import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'

const root = 'tmp/workbook-listening-intro'
const apply = process.argv.includes('--apply')
const verify = process.argv.includes('--verify')
const prepared = JSON.parse(await readFile(`${root}/prepared.json`, 'utf8'))
assert.ok(Object.values(prepared.checks).every(Boolean))
const schema = {}
vm.runInNewContext(ts.transpileModule(await readFile('src/lib/textbooks/listening.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: schema, require: createRequire(import.meta.url) })
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const code = 'eps-topik-2025-workbook-1'
const items = []
for (const unit of prepared.units) {
  assert.equal(sha(await readFile(unit.fullFile)), unit.fullChecksum)
  const segments = []
  for (const [index, group] of unit.groups.entries()) {
    assert.equal(sha(await readFile(group.file)), group.clipChecksum)
    const end = Math.min(group.timelineEnd, unit.groups[index + 1]?.timelineStart ?? unit.duration)
    segments.push({ id: `s${900001 + index}`, index: index + 1, start: group.timelineStart, end, clipStart: group.timelineStart, clipEnd: end, text_ko: group.text_ko, text_vi: group.text_vi, section: 'listening', role: 'instruction', questionNumber: group.startQ, questionEndNumber: group.endQ, groupInstruction: group.instruction, pageNumber: group.pageNumber, anchorY: group.anchorY, uncertain: group.uncertain, waveform: group.waveform, audio_path: `${code}/audio-groups-elevenlabs/intro-${unit.key}/${group.clipChecksum.slice(0,16)}/questions-${group.startQ}-${group.endQ}.mp3` })
  }
  const listening = { version: 1, status: 'draft', sourceChecksum: unit.sourceChecksum, duration: unit.duration, lesson: unit.unit_number, transcriptionProvider: 'elevenlabs', transcriptionModel: 'scribe_v2', segmentation: 'printed_question_groups_bell', translationProvider: 'human_authored_korean_vietnamese', waveform: unit.waveform, segments, answerGuide: [] }
  assert.ok(schema.parseListening({ listening }), unit.key)
  await writeFile(`${root}/${unit.key}/web-manifest.json`, JSON.stringify(listening, null, 2))
  items.push({ unit, listening })
}
assert.equal(items.reduce((n, x) => n + x.listening.segments.length, 0), 9)
console.log('Verified local manifests: 3 introduction units, 9 groups')
if (!apply && !verify) process.exit(0)
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const check = result => { if (result.error) throw new Error(result.error.message); return result.data }
const before = JSON.parse(await readFile(`${root}/database-before.json`, 'utf8'))
const book = check(await db.from('textbooks').select('id,metadata,is_published').eq('code', code).single())
assert.equal(book.metadata.access_mode, 'workbook_activation')
assert.equal(book.is_published, false)
const report = []
for (const { unit, listening } of items) {
  const target = before.book.textbook_units.find(u => u.unit_number === unit.unit_number)
  assert.ok(listening.segments.every(s => s.pageNumber >= target.start_page && s.pageNumber <= target.end_page))
  const digest = sha(Buffer.from(`${book.id}:${target.id}:workbook-intro-audio`))
  const id = `${digest.slice(0,8)}-${digest.slice(8,12)}-4${digest.slice(13,16)}-a${digest.slice(17,20)}-${digest.slice(20,32)}`
  const fullPath = `${code}/audio-intro/${unit.key}/${unit.fullChecksum.slice(0,16)}/full.mp3`
  const metadata = { storage_path: fullPath, source_files: unit.sourceFiles, source_checksums: unit.sourceChecksums, checksum: unit.fullChecksum, intro_audio_import: 1, listening }
  const existing = check(await db.from('textbook_resources').select('id,metadata').eq('unit_id', target.id).eq('kind', 'audio'))
  if (existing.some(r => r.id !== id)) throw new Error('Unexpected audio in introduction; refusing overwrite')
  const files = [{ path: fullPath, file: unit.fullFile, checksum: unit.fullChecksum }, ...listening.segments.map((s,i) => ({ path: s.audio_path, file: unit.groups[i].file, checksum: unit.groups[i].clipChecksum }))]
  for (const file of files) {
    const bytes = await readFile(file.file)
    if (apply) check(await db.storage.from('textbooks').upload(file.path, bytes, { contentType: 'audio/mpeg', cacheControl: '31536000', upsert: true }))
    const blob = check(await db.storage.from('textbooks').download(file.path))
    assert.equal(sha(Buffer.from(await blob.arrayBuffer())), file.checksum)
  }
  if (apply) check(await db.from('textbook_resources').upsert({ id, unit_id: target.id, kind: 'audio', title: `${unit.title} · File nghe đầy đủ`, resource_url: null, metadata, sort_order: 0, is_published: false }, { onConflict: 'id' }))
  const saved = check(await db.from('textbook_resources').select('metadata,is_published').eq('id', id).single())
  assert.deepEqual(saved.metadata, metadata)
  assert.equal(saved.is_published, false)
  report.push({ unit: unit.unit_number, title: unit.title, groups: listening.segments.length, resourceId: id, storageVerified: true })
}
const old = check(await db.from('textbook_resources').select('id,unit_id,title,metadata,is_published,sort_order').in('id', before.resources.map(r => r.id)))
assert.deepEqual(old.sort((a,b) => a.id.localeCompare(b.id)), before.resources.sort((a,b) => a.id.localeCompare(b.id)))
await writeFile('reports/workbook-intro-audio-installation.json', JSON.stringify({ applied: apply, verified: true, originalLessonResourcesUnchanged: old.length, units: report }, null, 2))
console.log(JSON.stringify(report))
