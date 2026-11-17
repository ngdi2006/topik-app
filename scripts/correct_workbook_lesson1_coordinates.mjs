import { readFile, writeFile, mkdir } from 'node:fs/promises'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
dotenv.config({ path: '.env.local', quiet: true })
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const check = result => { if (result.error) throw result.error; return result.data }
const code = 'eps-topik-2025-workbook-1'
const book = check(await db.from('textbooks').select('id,is_published').eq('code', code).single())
if (book.is_published) throw new Error('Expected admin preview book')
// Pixel rectangles verified against the original 1440 x 1864 scanned pages.
const boxes = {
  18: [[237,247,1277,323],[237,417,1277,445],[237,564,1277,592],[237,710,1277,738],[237,930,1277,958],[237,1076,1277,1104],[237,1223,1277,1251],[237,1370,1277,1398],[237,1516,1277,1544],[263,1673,682,1701]],
  21: [[801,405,871,434],[801,478,871,507],[801,552,871,580],[801,625,871,654]],
}
await mkdir('tmp/workbook-coordinate-corrections', { recursive: true })
const report = []
for (const [page, rectangles] of Object.entries(boxes)) {
  const row = check(await db.from('textbook_pages').select('ocr_payload,updated_at').eq('textbook_id', book.id).eq('page_number', Number(page)).single())
  await writeFile(`tmp/workbook-coordinate-corrections/p${page}-${Date.now()}-before.json`, JSON.stringify(row, null, 2))
  const payload = structuredClone(row.ocr_payload)
  for (const [index, [x,y,right,bottom]] of rectangles.entries()) {
    const field = payload.workbook.fields.find(field => field.id === `p${page}-f${index+1}`)
    if (field?.kind !== 'text') throw new Error(`Unexpected field p${page}-f${index+1}`)
    field.rect = { x:x/1440, y:y/1864, width:(right-x)/1440, height:(bottom-y)/1864 }
  }
  payload.workbook.coordinate_correction = 'lesson1-printed-lines-and-parentheses-v1'
  const saved = check(await db.from('textbook_pages').update({ ocr_payload: payload, updated_at: new Date().toISOString() }).eq('textbook_id', book.id).eq('page_number', Number(page)).eq('updated_at', row.updated_at).select('page_number'))
  if (saved.length !== 1) throw new Error('Concurrent edit; refusing to overwrite')
  const remote = check(await db.from('textbook_pages').select('ocr_payload').eq('textbook_id', book.id).eq('page_number', Number(page)).single())
  if (JSON.stringify(remote.ocr_payload.workbook.fields) !== JSON.stringify(payload.workbook.fields)) throw new Error('Saved layout mismatch')
  const beforeIds = row.ocr_payload.workbook.fields.map(field => field.id)
  if (JSON.stringify(beforeIds) !== JSON.stringify(payload.workbook.fields.map(field => field.id))) throw new Error('Field IDs changed')
  await writeFile(`tmp/workbook-interactions/${code}/${String(page).padStart(4,'0')}.json`, JSON.stringify(payload.workbook, null, 2))
  report.push({ page:Number(page), correctedFields:rectangles.length, idsPreserved:true, remoteVerified:true })
}
await writeFile('reports/workbook-lesson1-coordinate-correction.json', JSON.stringify({ correctedAt:new Date().toISOString(), report }, null, 2))
console.log(JSON.stringify(report))
