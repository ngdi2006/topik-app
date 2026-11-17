import { writeFile, mkdir } from 'node:fs/promises'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
dotenv.config({path:'.env.local',quiet:true})
const apply=process.argv.includes('--apply')
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}})
const codes=['eps-topik-2025-1','eps-topik-2025-2','eps-topik-2025-workbook-1','eps-topik-2025-workbook-2']
const check=result=>{if(result.error)throw new Error(result.error.message);return result.data}
const books=check(await db.from('textbooks').select('id,code,total_pages,is_published,metadata').in('code',codes))
if(books.length!==4)throw new Error('Expected exactly four EPS books')
const ids=books.map(book=>book.id)
const units=check(await db.from('textbook_units').select('id,textbook_id,unit_number,is_published').in('textbook_id',ids))
const audio=check(await db.from('textbook_resources').select('id,unit_id,is_published').in('unit_id',units.map(unit=>unit.id)).eq('kind','audio'))
for(const book of books){
 const pages=await db.from('textbook_pages').select('id',{count:'exact',head:true}).eq('textbook_id',book.id)
 if(pages.error||pages.count!==book.total_pages)throw new Error(`${book.code}: incomplete page import`)
 if(units.filter(unit=>unit.textbook_id===book.id&&unit.unit_number>0).length!==30)throw new Error(`${book.code}: expected 30 lessons`)
}
const report={apply,books:books.map(book=>({code:book.code,pages:book.total_pages,published:book.is_published})),units:units.length,audio:audio.length}
console.log(JSON.stringify(report))
if(process.argv.includes('--activation-access')){
 const catalog=check(await db.from('textbooks').select('code').or('is_published.eq.true,code.in.(eps-topik-2025-workbook-1,eps-topik-2025-workbook-2)'))
 if(codes.some(code=>!catalog.some(book=>book.code===code)))throw new Error('Restricted catalog is missing an EPS book')
 console.log('Verified learner catalog includes all four books with private activation workbooks')
 if(!apply)process.exit(0)
 const workbooks=books.filter(book=>book.code.includes('-workbook-'))
 const unitIds=units.filter(unit=>workbooks.some(book=>book.id===unit.textbook_id)).map(unit=>unit.id)
 const privateAudio=audio.filter(resource=>unitIds.includes(resource.unit_id))
 await mkdir('tmp/workbook-listening-elevenlabs/backups',{recursive:true})
 const backup=`tmp/workbook-listening-elevenlabs/backups/workbook-activation-${Date.now()}.json`
 await writeFile(backup,JSON.stringify({books,units,audio},null,2),{flag:'wx'})
 for(const book of workbooks)check(await db.from('textbooks').update({is_published:false,metadata:{...book.metadata,access_mode:'workbook_activation',activation_enabled:true}}).eq('id',book.id).select('id'))
 if(privateAudio.length)check(await db.from('textbook_resources').update({is_published:false}).in('id',privateAudio.map(resource=>resource.id)).select('id'))
 const savedBooks=check(await db.from('textbooks').select('code,is_published,metadata').in('id',workbooks.map(book=>book.id)))
 const savedAudio=check(await db.from('textbook_resources').select('id,is_published').in('id',privateAudio.map(resource=>resource.id)))
 if(savedBooks.some(book=>book.is_published||book.metadata?.access_mode!=='workbook_activation')||savedAudio.some(resource=>resource.is_published))throw new Error('Private workbook access verification failed')
 await writeFile('reports/workbook-account-access.json',JSON.stringify({verified:true,books:savedBooks.map(book=>({code:book.code,private:!book.is_published,mode:book.metadata.access_mode})),privateAudio:savedAudio.length,backup},null,2))
 console.log(`Verified private activation mode: ${savedBooks.length} workbooks, ${savedAudio.length} audio resources`)
 process.exit(0)
}
if(books.some(book=>book.metadata?.access_mode==='workbook_activation'))throw new Error('Workbooks use per-account activation; manage them in admin, not public release')
if(!apply)process.exit(0)
await mkdir('tmp/workbook-listening-elevenlabs/backups',{recursive:true})
const backup=`tmp/workbook-listening-elevenlabs/backups/eps-release-${Date.now()}.json`
await writeFile(backup,JSON.stringify({books,units,audio},null,2),{flag:'wx'})
check(await db.from('textbook_units').update({is_published:true}).in('textbook_id',ids).select('id'))
if(audio.length)check(await db.from('textbook_resources').update({is_published:true}).in('id',audio.map(resource=>resource.id)).select('id'))
check(await db.from('textbooks').update({is_published:true,updated_at:new Date().toISOString()}).in('id',ids).select('id'))
const verified=check(await db.from('textbooks').select('code,is_published').in('id',ids))
const verifiedUnits=check(await db.from('textbook_units').select('id,is_published').in('textbook_id',ids))
const verifiedAudio=audio.length?check(await db.from('textbook_resources').select('id,is_published').in('id',audio.map(resource=>resource.id))):[]
if(verified.some(row=>!row.is_published)||verifiedUnits.some(row=>!row.is_published)||verifiedAudio.some(row=>!row.is_published))throw new Error('Publication verification failed')
await writeFile('reports/eps-textbook-release.json',JSON.stringify({...report,books:verified,verified:true,backup},null,2))
console.log(`Verified release: ${verified.length} books, ${verifiedUnits.length} units, ${verifiedAudio.length} audio resources`)
