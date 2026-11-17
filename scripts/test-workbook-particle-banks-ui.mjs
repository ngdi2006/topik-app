import assert from'node:assert/strict'
import{readFile,writeFile}from'node:fs/promises'
import{createReadStream}from'node:fs'
import http from'node:http'
import path from'node:path'
import{build}from'../tmp/workbook-validation/node_modules/esbuild/lib/main.js'
import{chromium}from'../tmp/workbook-validation/node_modules/playwright/index.mjs'
import{compile}from'@tailwindcss/node'
import{Scanner}from'@tailwindcss/oxide'
const root='tmp/workbook-validation'
await writeFile(`${root}/matching-entry.jsx`,`import React,{useState}from'react';import{createRoot}from'react-dom/client';import Overlay from'../../src/components/textbooks/WorkbookPageOverlay';import KeyEditor from'../../src/components/textbooks/WorkbookAnswerKeyEditor';function App(){const[a,set]=useState(()=>JSON.parse(localStorage.getItem('fixture-matches')||'{}'));return <div data-sheet style={{position:'relative',width:'100%',maxWidth:900,margin:'auto'}}>{window.fixture.page===16?<KeyEditor bookId='fixture' pageNumber={16} workbook={window.fixture.workbook} onSaved={()=>{}}/>:null}<img src='/image' style={{width:'100%',display:'block'}}/><Overlay pageNumber={window.fixture.page} workbook={window.fixture.workbook} answers={a} onChange={(p,id,value)=>set(old=>{const next={...old,[p+':'+id]:value};localStorage.setItem('fixture-matches',JSON.stringify(next));return next})}/></div>}createRoot(document.getElementById('root')).render(<App/>);`)
const bundle=await build({entryPoints:[`${root}/matching-entry.jsx`],bundle:true,write:false,format:'iife',jsx:'automatic',define:{'process.env.NODE_ENV':'"development"'}})
const compiler=await compile(await readFile('src/app/globals.css','utf8'),{base:path.resolve('src/app'),onDependency(){}})
const css=compiler.build(new Scanner({sources:[{base:path.resolve('src'),pattern:'**/*.{tsx,ts}',negated:false}]}).scan())
const plans=await Promise.all([1,2].map(async v=>JSON.parse(await readFile(`tmp/workbook-choice-rows/eps-topik-2025-workbook-${v}/planned.json`,'utf8'))))
let selectedPage=17,selectedVolume=1
const server=http.createServer((req,res)=>{if(req.url==='/bundle'){res.end(bundle.outputFiles[0].contents);return}if(req.url==='/css'){res.setHeader('content-type','text/css');res.end(css);return}if(req.url==='/image'){res.setHeader('content-type','image/webp');createReadStream(`tmp/workbooks-2025/eps-topik-2025-workbook-${selectedVolume}/${String(selectedPage).padStart(4,'0')}.webp`).pipe(res);return}const p=plans[selectedVolume-1].pages.find(p=>p.pageNumber===selectedPage);res.setHeader('content-type','text/html');res.end(`<html><head><meta charset=utf-8><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/css"/></head><body><div id="root"></div><script>window.fixture=${JSON.stringify({page:selectedPage,workbook:p.workbook})}</script><script src="/bundle"></script></body></html>`)})
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`

const registry=JSON.parse(await readFile('src/lib/textbooks/workbook-particle-banks.json','utf8'))
const report=JSON.parse(await readFile('reports/workbook-particle-bank-audit.json','utf8'))
let browser;let cases=0
try{
 browser=await chromium.launch({channel:'msedge',headless:true})
 const page=await browser.newPage({hasTouch:true})
 for(const width of [320,390,1200])for(const group of report.groups){
  selectedPage=group.page;selectedVolume=group.volume;await page.setViewportSize({width,height:1200});await page.goto(base)
  await page.evaluate(()=>localStorage.clear());await page.reload()
  const drops=page.locator('[data-word-drop]');await drops.first().waitFor()
  assert.equal(await drops.count(),group.fieldIds.length)
  assert.ok((await drops.allTextContents()).every(text=>text===''),'New exercises must start blank')
  for(const id of group.fieldIds)assert.equal(await page.locator('textarea[data-workbook-field="'+id+'"]').count(),0)
  const compact=group.tokens.length>4
  for(let i=0;i<group.fieldIds.length;i++){
   const drop=page.locator('[data-word-drop="'+group.fieldIds[i]+'"]')
   const token=group.tokens[i%group.tokens.length]
   if(compact)await drop.click()
   await page.locator('[data-word-token="'+token+'"]:visible').click()
   if(!compact)await drop.click()
   assert.equal(await drop.textContent(),token)
  }
  const target=drops.last()
  if(compact)await page.locator('[data-word-bank-toggle]').click()
  const source=page.locator('[data-word-token]:visible').first()
  const token=await source.getAttribute('data-word-token')
  const s=await source.boundingBox(),d=await target.boundingBox()
  await page.mouse.move(s.x+s.width/2,s.y+s.height/2);await page.mouse.down();await page.mouse.move(d.x+d.width/2,d.y+d.height/2,{steps:10});await page.mouse.up()
  assert.equal(await target.textContent(),token)
  await page.mouse.move(s.x+5,s.y+5)
  assert.equal(await page.locator('[data-word-bank]').evaluate(el=>getComputedStyle(el).opacity),'1')
  await page.reload();await drops.first().waitFor()
  assert.equal(await target.textContent(),token)
  if(compact){await target.click();await page.getByRole('button',{name:'Xóa phần ghép',exact:true}).click()}else{await target.focus();await page.keyboard.press('Delete')}
  assert.equal(await target.textContent(),'')
  await page.mouse.click(0,0)
  await page.screenshot({path:'reports/workbook-particles-'+group.page+'-'+width+'.png',fullPage:true})
  cases++
 }
 console.log('PASS: '+cases+' page/viewport combinations, all 70 blanks: tap, reuse, replacement, drag, clear and reload')
}finally{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r))}
