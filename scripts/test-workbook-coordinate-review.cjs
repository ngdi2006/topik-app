const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'))
const plans=[1,2].map(v=>read(`tmp/workbook-coordinate-review/plan-${v}.json`))
const field=(v,p,id)=>plans[v-1].pages.find(q=>q.pageNumber===p).workbook.fields.find(f=>f.id===id)
test('all 543 reviewed pages retain stable question and option identifiers',()=>{
 let count=0
 for(const [index,plan]of plans.entries()){
  const source=read(`tmp/workbook-alignment/eps-topik-2025-workbook-${index+1}/source.json`)
  for(const page of plan.pages){
   const old=source.rows.find(r=>r.page_number===page.pageNumber).ocr_payload.workbook
   assert.deepEqual(page.workbook.fields.map(f=>f.id),old.fields.map(f=>f.id))
   page.workbook.fields.forEach((f,i)=>{assert.equal(f.kind,old.fields[i].kind);for(const k of['options','sources','targets'])assert.deepEqual(f[k].map(n=>n.id),old.fields[i][k].map(n=>n.id))})
   count++
  }
 }
 assert.equal(count,543)
})
test('dialogue answer widgets occupy separate printed lines and prompt boxes stay hidden',()=>{
 for(const[v,p,ids]of[[1,32,[9,10]],[1,48,[6,7]],[2,3,[6,7]],[2,24,[1,2]],[2,24,[6,7]]]){
  const a=field(v,p,`p${p}-f${ids[0]}`).rect,b=field(v,p,`p${p}-f${ids[1]}`).rect
  assert.ok(a.y+a.height<=b.y,`${v}/${p}: overlapping dialogue answers`)
 }
 for(const id of['p265-f8','p265-f10'])assert.equal(field(2,265,id).is_context,true)
 assert.equal(field(2,26,'p26-f4').is_context,true)
 // A misclassified circled 2 used to land on the previous reading exercise.
 const f=field(2,114,'p114-f2')
 assert.ok(f.options.every(o=>o.rect.y>.8))
})
test('printed-letter audit and widget collision audit have no unresolved findings',()=>{
 assert.deepEqual(read('tmp/workbook-coordinate-review/ink-issues.json'),[])
 assert.deepEqual(read('tmp/workbook-coordinate-review/overlap-issues.json'),[])
 assert.deepEqual(read('reports/workbook-coordinate-plan.json').issues,[])
})
