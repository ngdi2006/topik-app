import { readFile, writeFile, stat } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import vm from 'node:vm'
import ts from 'typescript'
import * as zod from 'zod'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { validateSegments } from './lib/workbook-listening.mjs'
dotenv.config({ path: '.env.local', quiet: true })
const model = {}
vm.runInNewContext(ts.transpileModule(await readFile('src/lib/textbooks/listening.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: model, require: () => zod })
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const check = result => { if (result.error) throw result.error; return result.data }
const results = []; const failures = []
const bucket = check(await db.storage.getBucket('textbooks'))
if (bucket.public) throw new Error('Textbook bucket must remain private')
for (let volume = 1; volume <= 2; volume++) {
  const book = check(await db.from('textbooks').select('id,code,is_published').eq('code', `eps-topik-2025-workbook-${volume}`).single())
  if (book.is_published) throw new Error('Workbook must remain admin preview')
  const units = check(await db.from('textbook_units').select('id,unit_number,start_page,end_page').eq('textbook_id', book.id))
  const resources = check(await db.from('textbook_resources').select('id,unit_id,metadata').in('unit_id', units.map(unit => unit.id)).eq('kind', 'audio'))
  for (let number = (volume - 1) * 30 + 1; number <= volume * 30; number++) {
    try {
      const unit = units.find(unit => unit.unit_number === number)
      const resource = resources.find(item => item.unit_id === unit?.id && item.metadata?.source_file === `B${number}.mp3`)
      const manifest = model.parseListening(resource?.metadata)
      if (!manifest || !manifest.segments.length || manifest.transcriptionProvider !== 'gemini') throw new Error('Missing/invalid Gemini manifest')
      validateSegments(manifest.segments, manifest.duration)
      const original = await readFile(`D:/DATA-E9/MP3-SBT-Q${volume}/FULL/B${number}.mp3`)
      if (createHash('sha256').update(original).digest('hex') !== manifest.sourceChecksum) throw new Error('Source checksum mismatch')
      const local = JSON.parse(await readFile(`tmp/workbook-listening/B${number}/manifest.json`, 'utf8'))
      const fields = new Map()
      for (let page = unit.start_page; page <= unit.end_page; page++) {
        const layout = JSON.parse(await readFile(`tmp/workbook-interactions/${book.code}/${String(page).padStart(4, '0')}.json`, 'utf8'))
        for (const field of layout.fields) fields.set(`${page}:${field.id}`, field)
      }
      for (const segment of manifest.segments) {
        if (!segment.text_ko.trim() || !segment.text_vi.trim()) throw new Error(`Empty transcript ${segment.id}`)
        const cached = local.segments.find(item => item.id === segment.id)
        if (cached?.audio_path !== segment.audio_path || (await stat(cached.local_file)).size < 100) throw new Error(`Clip mismatch ${segment.id}`)
      }
      for (const guide of manifest.answerGuide) {
        const field = fields.get(`${guide.pageNumber}:${guide.fieldId}`)
        if (!field || guide.optionIds.some(id => !field.options.some(option => option.id === id))) throw new Error('Invalid answer field/option')
        if (guide.evidenceSegmentIds.some(id => !manifest.segments.some(segment => segment.id === id))) throw new Error('Invalid evidence')
        if ((guide.optionIds.length || guide.answerText) && !guide.evidenceSegmentIds.length) throw new Error('Answer without audio evidence')
        if (guide.confidence === 'insufficient' && (guide.optionIds.length || guide.answerText)) throw new Error('Unsupported answer')
      }
      // Check both ends of every lesson against private remote clip bytes.
      for (const segment of [manifest.segments[0], manifest.segments.at(-1)]) {
        const remote = check(await db.storage.from('textbooks').download(segment.audio_path))
        const cached = local.segments.find(item => item.id === segment.id)
        if (createHash('sha256').update(Buffer.from(await remote.arrayBuffer())).digest('hex') !== createHash('sha256').update(await readFile(cached.local_file)).digest('hex')) throw new Error('Remote clip checksum mismatch')
      }
      results.push({ lesson: number, clips: manifest.segments.length, guides: manifest.answerGuide.length, insufficient: manifest.answerGuide.filter(item => item.confidence === 'insufficient').length, duration: manifest.duration, repaired: resource.metadata.playback_index_repaired === true })
      console.log(`B${number}: verified ${manifest.segments.length} clips, ${manifest.answerGuide.length} draft guides`)
    } catch (error) { failures.push({ lesson: number, error: error.message }); console.error(`B${number}: ${error.message}`) }
  }
}
const report = { verifiedAt: new Date().toISOString(), lessons: results.length, clips: results.reduce((sum, row) => sum + row.clips, 0), guides: results.reduce((sum, row) => sum + row.guides, 0), insufficient: results.reduce((sum, row) => sum + row.insufficient, 0), durationHours: results.reduce((sum, row) => sum + row.duration, 0) / 3600, results, failures }
await writeFile('reports/workbook-listening-verification.json', JSON.stringify(report, null, 2))
console.log(JSON.stringify({ lessons: report.lessons, clips: report.clips, guides: report.guides, failures }))
if (failures.length || results.length !== 60) process.exitCode = 1
