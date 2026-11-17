const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs')
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'))
test('all option row targets contain their original number and stay separate',()=>{
 let count=0
 for(const v of[1,2])for(const p of read(`tmp/workbook-choice-rows/eps-topik-2025-workbook-${v}/planned.json`).pages){
  const nodes=p.workbook.fields.filter(f=>f.kind==='choice'&&!f.is_context).flatMap(f=>f.options)
  for(const n of nodes){
   const r=n.rect,h=n.hit_rect
   assert.ok(h&&h.width>0&&h.height>0)
   assert.ok(h.x<=r.x+.00001&&h.y<=r.y+.00001&&h.x+h.width>=r.x+r.width-.00001&&h.y+h.height>=r.y+r.height-.00001,`Target misses marker ${v}/${p.pageNumber}/${n.id}`)
   assert.ok(h.x>=0&&h.y>=0&&h.x+h.width<=1&&h.y+h.height<=1)
   count++
  }
  for(let i=0;i<nodes.length;i++)for(const n of nodes.slice(i+1)){
   const a=nodes[i].hit_rect,b=n.hit_rect
   const area=Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y))
   assert.ok(area/Math.min(a.width*a.height,b.width*b.height)<.1,`Overlapping option targets ${v}/${p.pageNumber}`)
  }
 }
 assert.equal(count,5010)
})
test('page 39 has all twelve table cells while existing saved-answer IDs remain',()=>{
 const root='tmp/workbook-choice-rows/eps-topik-2025-workbook-1/'
 const before=read(root+'source.json').rows.find(p=>p.page_number===39).ocr_payload.workbook
 const after=read(root+'planned.json').pages.find(p=>p.pageNumber===39).workbook
 assert.ok(before.fields.every(f=>after.fields.some(n=>n.id===f.id&&n.kind===f.kind)))
 assert.equal(after.fields.length,before.fields.length+(before.fields.some(f=>f.id==='p39-table-masida')?0:1))
 const cells=after.fields.filter(f=>f.section==='grammar'&&/^1[. ]/.test(f.label))
 assert.equal(cells.length,12)
 assert.equal(cells[0].label,'1. 마시다')
 for(let i=1;i<cells.length;i++)assert.ok(cells[i-1].rect.y+cells[i-1].rect.height<cells[i].rect.y)
})
