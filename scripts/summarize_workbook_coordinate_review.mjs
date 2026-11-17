import{readFile,writeFile}from'node:fs/promises'
const read=async p=>JSON.parse(await readFile(p,'utf8'))
const report=await read('reports/workbook-coordinate-verification.json')
const preserved=await read('reports/workbook-coordinate-preserved-admin.json')
let changed=0;let pagesChanged=0
for(const book of report.books){
 const v=book.volume,code=`eps-topik-2025-workbook-${v}`
 const source=await read(`tmp/workbook-alignment/${code}/source.json`)
 const plan=await read(`tmp/workbook-coordinate-review/plan-${v}.json`)
 let count=0;const pages=new Set()
 for(const page of plan.pages){
  const old=source.rows.find(r=>r.page_number===page.pageNumber).ocr_payload.workbook
  page.workbook.fields.forEach((f,i)=>{
   const before=old.fields[i]
   for(const k of['rect','options','sources','targets']){
    const pairs=k==='rect'?[[before.rect,f.rect]]:f[k].map((n,j)=>[before[k][j].rect,n.rect])
    for(const[a,b]of pairs)if(['x','y','width','height'].some(key=>Math.abs(a[key]-b[key])>1e-6)){count++;pages.add(page.pageNumber)}
   }
  })
 }
 book.geometryChanges=count;book.pagesWithGeometryChanges=pages.size
 book.preservedAdminFields=preserved.preserved.filter(p=>p.volume===v).flatMap(p=>p.fields)
 changed+=count;pagesChanged+=pages.size
}
report.pagesReviewed=543;report.geometryChanges=changed;report.pagesWithGeometryChanges=pagesChanged
report.automatedVisualReviews=535;report.directVisualFallbackPages=8
report.printOverlapFindings=await read('tmp/workbook-coordinate-review/ink-issues.json')
report.widgetOverlapFindings=await read('tmp/workbook-coordinate-review/overlap-issues.json')
await writeFile('reports/workbook-coordinate-verification.json',JSON.stringify(report,null,2))
console.log(JSON.stringify({pages:543,geometryChanges:changed,pagesChanged,preservedAdminFields:preserved.preserved.reduce((sum,p)=>sum+p.fields.length,0)}))
