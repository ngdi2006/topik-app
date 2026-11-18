// Idempotent import of the five standalone reference scans, separate from course content.
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { referenceUnits } from './eps-reference-toc-data.mjs'

const root = 'tmp/eps-reference-books'
const books = JSON.parse(await readFile(`${root}/manifest.json`, 'utf8'))
const upload = process.argv.includes('--upload')
const publish = process.argv.includes('--publish')
if (publish && !upload) throw new Error('--publish requires --upload')
const db = upload ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } }) : null
const check = result => { if (result.error) throw new Error(result.error.message); return result.data }
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
async function retry(action) {
  for (let attempt = 0; ; attempt++) {
    try { return check(await action()) } catch (error) {
      if (attempt >= 3) throw error
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)))
    }
  }
}
const report = { generatedAt: new Date().toISOString(), applied: upload, published: publish, books: [] }
for (const book of books) {
  const units = referenceUnits(book)
  if (book.pages.length !== book.total_pages || book.pages.some((p, i) => p.page_number !== i + 1)) throw new Error(`${book.code}: incomplete source pages`)
  const entry = { code: book.code, title: book.title_vi, sourceFile: book.source_file, pages: book.total_pages, units: units.length, lessons: book.kind === 'grammar' ? null : units.filter(u => u.unit_number > 0).length }
  console.log(JSON.stringify(entry))
  if (!upload) { report.books.push(entry); continue }
  const existing = check(await db.from('textbooks').select('id,source_hash,is_published').eq('code', book.code).maybeSingle())
  if (existing && existing.source_hash !== book.source_hash) throw new Error(`${book.code}: source hash mismatch; refusing to overwrite`)
  const row = existing || check(await db.from('textbooks').insert({ code: book.code, title_vi: book.title_vi, title_ko: book.title_ko, volume: book.volume, edition: '2025', total_pages: book.total_pages, source_hash: book.source_hash, metadata: { kind: book.kind, standalone_reference: true, source_file: book.source_file, source_sha256: book.source_hash, source_publisher: 'Trung tâm Ngoại ngữ Korea Link', import_version: 1, content_format: 'original_scan', unit_mapping: 'visually_verified_source_pdf_headings', shared_source_pages: true }, is_published: false }).select('id').single())
  const stored = check(await db.from('textbook_pages').select('page_number,checksum').eq('textbook_id', row.id).order('page_number'))
  if (stored.some(page => page.page_number > book.total_pages)) throw new Error(`${book.code}: unexpected existing pages`)
  const checksums = new Map(stored.map(p => [p.page_number, p.checksum]))
  for (let offset = 0; offset < book.pages.length; offset += 4) {
    await Promise.all(book.pages.slice(offset, offset + 4).map(async page => {
      const bytes = await readFile(page.file)
      const checksum = sha(bytes)
      if (checksums.get(page.page_number) === checksum) return
      const storagePath = `${book.code}/pages-webp/${String(page.page_number).padStart(4, '0')}.webp`
      await retry(() => db.storage.from('textbooks').upload(storagePath, bytes, { contentType: 'image/webp', cacheControl: '31536000', upsert: true }))
      await retry(() => db.from('textbook_pages').upsert({ textbook_id: row.id, page_number: page.page_number, image_path: storagePath, width: page.width, height: page.height, checksum, ocr_text: null, ocr_payload: { source_file: book.source_file, source_pdf_page: page.page_number, transcription: 'original_scan_only' } }, { onConflict: 'textbook_id,page_number' }))
    }))
    if (offset % 20 === 0 || offset + 4 >= book.pages.length) console.log(`${book.code}: ${Math.min(offset + 4, book.pages.length)}/${book.pages.length} pages`)
  }
  const savedPages = check(await db.from('textbook_pages').select('page_number,checksum').eq('textbook_id', row.id).order('page_number'))
  if (savedPages.length !== book.total_pages || savedPages.some((p, i) => p.page_number !== i + 1)) throw new Error(`${book.code}: incomplete upload`)
  for (const page of savedPages) if (page.checksum !== sha(await readFile(book.pages[page.page_number - 1].file))) throw new Error(`${book.code}: checksum mismatch on page ${page.page_number}`)
  check(await db.from('textbook_units').upsert(units.map(unit => ({ ...unit, textbook_id: row.id, is_published: publish || !!existing?.is_published })), { onConflict: 'textbook_id,unit_number' }))
  const savedUnits = check(await db.from('textbook_units').select('unit_number,start_page,end_page,title_vi,is_published').eq('textbook_id', row.id).order('sort_order'))
  if (savedUnits.length !== units.length || savedUnits.some((u, i) => u.unit_number !== units[i].unit_number || u.start_page !== units[i].start_page || u.end_page !== units[i].end_page || u.title_vi !== units[i].title_vi)) throw new Error(`${book.code}: index verification failed`)
  const coverPath = `${book.code}/cover.webp`
  const coverBytes = await readFile(book.cover)
  await retry(() => db.storage.from('textbooks').upload(coverPath, coverBytes, { contentType: 'image/webp', cacheControl: '31536000', upsert: true }))
  for (const number of new Set([1, Math.ceil(book.total_pages / 2), book.total_pages])) {
    const imagePath = `${book.code}/pages-webp/${String(number).padStart(4, '0')}.webp`
    const blob = check(await db.storage.from('textbooks').download(imagePath))
    if (sha(Buffer.from(await blob.arrayBuffer())) !== sha(await readFile(book.pages[number - 1].file))) throw new Error(`${book.code}: stored image mismatch`)
  }
  check(await db.from('textbooks').update({ cover_path: coverPath, is_published: publish || !!existing?.is_published, updated_at: new Date().toISOString() }).eq('id', row.id))
  const savedBook = check(await db.from('textbooks').select('id,is_published,cover_path,total_pages').eq('id', row.id).single())
  if (savedBook.total_pages !== book.total_pages || savedBook.cover_path !== coverPath || (publish && !savedBook.is_published)) throw new Error(`${book.code}: publication verification failed`)
  report.books.push({ ...entry, id: row.id, isPublished: savedBook.is_published, verifiedPages: savedPages.length, verifiedUnits: savedUnits.length, sampledStorageImagesVerified: true })
  await mkdir('reports', { recursive: true })
  await writeFile('reports/eps-reference-books-import.json', JSON.stringify(report, null, 2))
}
await mkdir('reports', { recursive: true })
await writeFile('reports/eps-reference-books-import.json', JSON.stringify(report, null, 2))
console.log(`Report: reports/eps-reference-books-import.json`)
