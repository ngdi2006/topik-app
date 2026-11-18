import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createClient } from '@supabase/supabase-js'
const codes=['eps-topik-2025-vocabulary-1','eps-topik-2025-vocabulary-2','eps-topik-2025-culture-1','eps-topik-2025-culture-2','eps-topik-2025-grammar-1']
const apply=process.argv.includes('--apply')
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}})
const check=result=>{if(result.error)throw new Error(result.error.message);return result.data}
const books=check(await db.from('textbooks').select('id,code,is_published,metadata,total_pages').in('code',codes))
if(books.length!==5)throw new Error('Expected five reference books')
for(const book of books){const pages=await db.from('textbook_pages').select('id',{count:'exact',head:true}).eq('textbook_id',book.id);check(pages);if(pages.count!==book.total_pages)throw new Error('Incomplete book')}
await mkdir('.tmp/eps-validation',{recursive:true})
if(apply){
 await writeFile(`.tmp/eps-validation/reference-access-before-${Date.now()}.json`,JSON.stringify(books,null,2),{flag:'wx'})
 for(const book of books)check(await db.from('textbooks').update({is_published:false,metadata:{...book.metadata,access_mode:'reference_activation',activation_enabled:true}}).eq('id',book.id))
}
const saved=check(await db.from('textbooks').select('id,code,is_published,metadata').in('code',codes))
if(apply&&saved.some(book=>book.is_published||book.metadata.access_mode!=='reference_activation'||!book.metadata.activation_enabled))throw new Error('Access mode verification failed')
await writeFile('reports/reference-access-activation.json',JSON.stringify({applied:apply,books:saved.map(b=>({code:b.code,private:!b.is_published,mode:b.metadata.access_mode}))},null,2))
console.log(JSON.stringify({applied:apply,books:saved.map(b=>({code:b.code,private:!b.is_published,mode:b.metadata.access_mode}))}))
