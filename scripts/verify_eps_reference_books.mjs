import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { createClient } from '@supabase/supabase-js'
import { referenceUnits } from './eps-reference-toc-data.mjs'

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
const scans = JSON.parse(await readFile('tmp/eps-reference-books/manifest.json', 'utf8'))
const [before, settingsBefore] = JSON.parse(await readFile('tmp/eps-reference-books/database-before.json', 'utf8'))
const published = process.argv.includes('--published')
const check = result => { if (result.error) throw new Error(result.error.message); return result.data }
const [allBooks, settings, mainLessons] = await Promise.all([
  db.from('textbooks').select('id,code,title_vi,volume,is_published,metadata,source_hash,total_pages,cover_path,textbook_units(id,unit_number,title_vi,title_ko,start_page,end_page,sort_order,is_published)'),
  db.from('eps_curriculum_settings').select('version,released'),
  db.from('textbook_units').select('id,textbooks!inner(title_vi,volume,is_published)').eq('is_published', true).eq('textbooks.is_published', true).not('textbooks.code', 'in', `(${scans.map(b => b.code).join(',')})`),
]).then(results => results.map(check))
assert.deepEqual(settings, settingsBefore, 'Unrelated EPS curriculum settings changed')
for (const original of before) {
  const actual = allBooks.find(book => book.id === original.id)
  const normalized = Object.fromEntries(Object.keys(original).map(key => [key, key === 'textbook_units' ? actual[key].map(unit => Object.fromEntries(Object.keys(original.textbook_units[0]).map(field => [field, unit[field]]))).sort((a, b) => a.id.localeCompare(b.id)) : actual[key]]))
  const expected = { ...original, textbook_units: [...original.textbook_units].sort((a, b) => a.id.localeCompare(b.id)) }
  assert.deepEqual(normalized, expected, `${original.code} changed`)
}
const results = []
for (const scan of scans) {
  const actual = allBooks.find(book => book.code === scan.code)
  assert.ok(actual, `${scan.code} is missing`)
  assert.equal(actual.source_hash, scan.source_hash)
  assert.equal(actual.total_pages, scan.total_pages)
  assert.equal(actual.is_published, published)
  assert.equal(actual.textbook_units.length, referenceUnits(scan).length)
  assert.ok(actual.textbook_units.every(unit => unit.is_published === published))
  const pages = check(await db.from('textbook_pages').select('page_number,checksum,width,height').eq('textbook_id', actual.id).order('page_number'))
  assert.equal(pages.length, scan.total_pages)
  assert.ok(pages.every((p, i) => p.page_number === i + 1 && p.checksum && p.width === 1440 && p.height > 0))
  results.push({ code: scan.code, id: actual.id, pages: pages.length, units: actual.textbook_units.length, published: actual.is_published })
}
const report = { verifiedAt: new Date().toISOString(), published, originalBooksUnchanged: before.length, separateEpsCurriculumUnchanged: true, mainLessonCount: mainLessons.length, pages: results.reduce((sum, b) => sum + b.pages, 0), indexedSections: results.reduce((sum, b) => sum + b.units, 0), books: results }
await writeFile('reports/eps-reference-books-verification.json', JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
