const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs')
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'))
const plans=[1,2].map(v=>read(`tmp/workbook-choice-rows/eps-topik-2025-workbook-${v}/planned.json`))
const page=(v,p)=>plans[v-1].pages.find(q=>q.pageNumber===p).workbook
test('table corrections retain existing answer identifiers and all choice hit areas',()=>{
 for(const[v,plan]of plans.entries()){
  const source=read(`tmp/workbook-choice-rows/eps-topik-2025-workbook-${v+1}/source.json`)
  for(const p of plan.pages){
   const old=source.rows.find(r=>r.page_number===p.pageNumber).ocr_payload.workbook
   assert.ok(old.fields.every(f=>p.workbook.fields.some(n=>n.id===f.id&&n.kind===f.kind)))
   assert.ok(p.workbook.fields.length<=80)
   for(const f of old.fields.filter(f=>f.kind!=='text'))assert.deepEqual(p.workbook.fields.find(n=>n.id===f.id),f)
   const fields=p.workbook.fields.filter(f=>f.kind==='text'&&!f.is_context)
   for(let i=0;i<fields.length;i++)for(const f of fields.slice(i+1)){
    const a=fields[i].rect,b=f.rect
    const area=Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y))
    assert.ok(area/Math.min(a.width*a.height,b.width*b.height)<.2,`Inputs overlap ${v+1}/${p.pageNumber}/${f.id}`)
   }
  }
 }
})
test('all letter cells and both verb-conjugation columns are covered',()=>{
 assert.equal(page(1,55).fields.filter(f=>!f.is_context&&f.kind==='text').length,24)
 const table=page(1,56).fields.slice(0,20)
 for(let i=0;i<table.length;i+=2){
  assert.ok(table[i].rect.width>.29)
  assert.ok(table[i+1].rect.x>table[i].rect.x+table[i].rect.width)
  assert.ok(Math.abs(table[i].rect.y-table[i+1].rect.y)<.002)
 }
 assert.equal(page(1,14).fields.filter(f=>!f.is_context).length,22)
 for(const f of page(2,108).fields)assert.ok(f.rect.height>.035&&f.rect.width>.17)
 const last=page(2,108).fields.at(-1).rect
 assert.ok(last.width>.25,'All four answer cells must fit inside the final field')
})
