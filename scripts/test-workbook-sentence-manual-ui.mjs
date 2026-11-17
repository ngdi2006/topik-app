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

const registry=Object.fromEntries(plans.flatMap(plan=>plan.pages.map(page=>[page.workbook.image_hash,Object.fromEntries(page.workbook.fields.filter(field=>field.kind==='text'&&!field.is_context&&field.rect.width>=.45&&field.label.includes('/')).map(field=>[field.id,true]))]).filter(([,fields])=>Object.keys(fields).length)))
let browser;let checked=0
try{
 browser=await chromium.launch({channel:'msedge',headless:true})
 const page=await browser.newPage({hasTouch:true})
 for(const width of [390,1200])for(const volume of [1,2])for(const p of plans[volume-1].pages){
  const fields=registry[p.workbook.image_hash];if(!fields)continue
  selectedVolume=volume;selectedPage=p.pageNumber;await page.setViewportSize({width,height:1200});await page.goto(base)
  const ids=Object.keys(fields);await page.locator('[data-workbook-field="'+ids[0]+'"]').first().waitFor({state:'attached'})
  assert.equal(await page.locator('[data-sentence-composer],[data-sentence-order],[data-order-token],[data-composer-token]').count(),0)
  for(const id of ids){
   const input=page.locator((width<640?'button':'textarea')+'[data-workbook-field="'+id+'"]:visible')
   assert.equal(await input.count(),1,'Every sentence must have one manual input: '+volume+'/'+p.pageNumber+'/'+id)
  }
  checked+=ids.length
 }
 selectedVolume=1;selectedPage=239;await page.goto(base)
 await page.evaluate(()=>localStorage.setItem('fixture-matches',JSON.stringify({'239:p239-f3':'saved answer'})));await page.reload()
 assert.equal(await page.locator('textarea[data-workbook-field="p239-f3"]:visible').inputValue(),'saved answer')
 await page.locator('textarea[data-workbook-field="p239-f1"]:visible').fill('manual Korean answer')
 await page.reload();assert.equal(await page.locator('textarea[data-workbook-field="p239-f1"]:visible').inputValue(),'manual Korean answer')
 await page.screenshot({path:'reports/workbook-sentence-manual-1200.png',fullPage:true})
 await page.setViewportSize({width:390,height:844});await page.reload()
 await page.locator('button[data-workbook-field="p239-f1"]:visible').click()
 const dialog=page.getByRole('dialog');await dialog.locator('textarea').fill('mobile handwritten answer')
 await dialog.getByRole('button',{name:'Xong',exact:true}).click();await dialog.waitFor({state:'hidden'})
 await page.reload();assert.equal(await page.locator('button[data-workbook-field="p239-f1"]:visible').textContent(),'mobile handwritten answer')
 await page.screenshot({path:'reports/workbook-sentence-manual-390.png',fullPage:true})
 console.log('PASS: '+checked+' sentence/viewport checks (sentence completion prompts), no token widgets, manual desktop/mobile edits, old answers retained and reload persistence')
}finally{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r))}
