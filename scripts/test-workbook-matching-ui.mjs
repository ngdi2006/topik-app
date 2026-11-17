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
let selectedPage=37,selectedVolume=1
const server=http.createServer((req,res)=>{if(req.url==='/bundle'){res.end(bundle.outputFiles[0].contents);return}if(req.url==='/css'){res.setHeader('content-type','text/css');res.end(css);return}if(req.url==='/image'){res.setHeader('content-type','image/webp');createReadStream(`tmp/workbooks-2025/eps-topik-2025-workbook-${selectedVolume}/${String(selectedPage).padStart(4,'0')}.webp`).pipe(res);return}const p=plans[selectedVolume-1].pages.find(p=>p.pageNumber===selectedPage);res.setHeader('content-type','text/html');res.end(`<html><head><meta charset=utf-8><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/css"/></head><body><div id="root"></div><script>window.fixture=${JSON.stringify({page:selectedPage,workbook:p.workbook})}</script><script src="/bundle"></script></body></html>`)})
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`
let browser,debugPage
try{
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-sandbox']})
 const page=await browser.newPage({viewport:{width:1200,height:1000},hasTouch:true})
 debugPage=page
 await page.goto(base);await page.locator('[data-match-port]').first().waitFor()
 assert.equal(await page.locator('[data-match-port]').count(),22)
 const stage=plans[0].pages.find(p=>p.pageNumber===37).workbook.fields.find(f=>f.id==='p37-match-verbs')
 for(const source of stage.sources.slice(0,2)){
  await page.getByRole('button',{name:`${stage.label}: chọn ${source.label} để nối`,exact:true}).click()
  await page.getByRole('button',{name:`${stage.label}: nối tới ${stage.targets[0].label}`,exact:true}).click()
 }
 assert.equal(await page.locator('[data-match-connection]').count(),2)
 await page.reload();await page.locator('[data-match-connection]').first().waitFor();assert.equal(await page.locator('[data-match-connection]').count(),2)
 await page.screenshot({path:'reports/workbook-matching-37-desktop.png',fullPage:true})
 await page.setViewportSize({width:390,height:844})
 await page.reload();await page.locator('[data-match-port]').first().waitFor();assert.equal(await page.locator('[data-match-connection]').count(),2)
 const source=stage.sources[2]
 await page.getByRole('button',{name:`${stage.label}: chọn ${source.label} để nối`,exact:true}).tap()
 await page.getByRole('button',{name:`${stage.label}: nối tới ${stage.targets[0].label}`,exact:true}).tap()
 assert.equal(await page.locator('[data-match-connection]').count(),3)
 selectedPage=47;await page.goto(base);await page.locator('[data-match-port]').first().waitFor();assert.equal(await page.locator('[data-match-port]').count(),10)
 await page.screenshot({path:'reports/workbook-matching-47-mobile.png',fullPage:true})
 for(const width of [390,1200]) {
  await page.setViewportSize({width,height:1000})
  for(const number of [15,85]) {
   selectedPage=number;await page.evaluate(()=>localStorage.removeItem("fixture-matches"));await page.goto(base);await page.locator('[data-match-port]').first().waitFor();await page.waitForFunction(()=>document.querySelector('[data-sheet] > img').complete && document.querySelector('[data-sheet] > img').naturalWidth>0)
   const field=plans[0].pages.find(p=>p.pageNumber===number).workbook.fields.find(f=>f.kind==='match')
   const sources=page.locator('[data-match-port="source"]'),targets=page.locator('[data-match-port="target"]')
   const sheet=await page.locator('[data-sheet]').boundingBox()
   const image=await page.locator('[data-sheet] > img').boundingBox()
   // Click the flag/sentence content itself, away from its connection dot.
   const source=field.sources[0]
   await page.mouse.click(sheet.x+(number===15?.27:.25)*sheet.width,image.y+(source.rect.y+source.rect.height/2)*image.height)
   assert.equal(await sources.first().getAttribute('aria-pressed'),'true')
   const target=field.targets[1]
   await page.mouse.click(sheet.x+(number===15?.72:.76)*sheet.width,image.y+(target.rect.y+target.rect.height/2)*image.height)
   await page.locator('[data-match-connection]').first().waitFor({state:'attached'})
   assert.equal(await sources.first().getAttribute('aria-pressed'),'false')
   const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('fixture-matches')))
   assert.equal(saved[`${number}:${field.id}`][source.id],target.id)
   if(number===85){
    const left=await sources.first().locator('span').first().boundingBox(),right=await targets.first().locator('span').first().boundingBox()
    assert.ok(right.x-left.x>sheet.width*.075,'Sentence and picture ports must occupy separate columns')
   }
   await page.screenshot({path:`reports/workbook-matching-content-${number}-${width}.png`,fullPage:true})
  }
 }
 console.log('PASS: desktop/mobile ports, complete third column, shared targets, reload persistence and day-word alignment')
 selectedPage=95
 for(const width of [390,1200]){
  await page.setViewportSize({width,height:1000});await page.evaluate(()=>localStorage.removeItem("fixture-matches"));await page.goto(base)
  await page.locator('[data-choice-option]').first().waitFor()
  assert.equal(await page.locator('[data-workbook-field="p95-f4"]').count(),0,'Multiple-choice prompt blank must not be editable')
  assert.equal(await page.locator('[data-workbook-field="p95-f5"]').count(),4)
  await page.locator('[data-workbook-field="p95-f5"][data-choice-option="4"]').click()
  assert.equal(await page.locator('[data-workbook-field="p95-f5"][data-choice-option="4"]').getAttribute('aria-pressed'),'true')
  await page.screenshot({path:`reports/workbook-choice-no-blank-95-${width}.png`,fullPage:true})
 }
 const pictureReport=JSON.parse(await readFile('reports/workbook-picture-choice-measurement.json','utf8'))
 for(const entry of [...pictureReport,...pictureReport.filter(e=>e.volume===1&&e.page===97).map(e=>({...e,desktop:true}))]){
  selectedPage=entry.page;selectedVolume=entry.volume
  await page.setViewportSize({width:entry.desktop?1200:390,height:1600});await page.evaluate(()=>localStorage.removeItem("fixture-matches"));await page.goto(base)
  const options=page.locator(`[data-workbook-field="${entry.field}"][data-choice-picture]`)
  await options.first().waitFor()
  await page.waitForFunction(()=>document.querySelector('[data-sheet] > img').complete && document.querySelector('[data-sheet] > img').naturalWidth>0)
  assert.equal(await options.count(),4)
  for(let index=0;index<4;index++){
   const option=options.nth(index)
   await option.scrollIntoViewIfNeeded()
   const box=await option.boundingBox()
   await page.mouse.click(box.x+box.width/2,box.y+box.height*.3)
   assert.equal(await option.getAttribute('aria-pressed'),'true',JSON.stringify(entry))
   assert.equal(await options.filter({has:page.locator('[data-choice-marker]')}).count(),4)
  }
  if(entry.volume===1&&entry.page===97)await page.screenshot({path:`reports/workbook-picture-answer-${entry.field}-${entry.desktop?1200:390}.png`,fullPage:true})
 }
 console.log(`PASS ${pictureReport.length} picture questions: all four pictures select their own numbered answer on mobile`)

 selectedPage=16;selectedVolume=1
 await page.setViewportSize({width:1200,height:1000})
 let installedKey
 await page.route('**/api/textbooks/fixture/workbook',async route=>{installedKey=route.request().postDataJSON();await route.fulfill({json:{ok:true}})})
 await page.goto(base)
 await page.locator('button').filter({hasText:'Đáp án chuẩn'}).click()
 const dialog=page.getByRole('dialog')
 await dialog.locator('textarea').first().fill('검증된 답')
 await dialog.getByRole('checkbox').first().check()
 await dialog.locator('button').filter({hasText:'Lưu đáp án'}).click()
 await page.waitForFunction(()=>!document.querySelector('[role="dialog"]'))
 assert.equal(installedKey.workbook.fields[0].answer_key.value,'검증된 답')
 assert.equal(installedKey.workbook.fields[0].answer_key.status,'reviewed')
 console.log('PASS admin answer-key editor: entered, verified and submitted a key through mocked PATCH')

}catch(error){await debugPage?.screenshot({path:'reports/workbook-matching-content-error.png',fullPage:true});console.log(await debugPage?.locator('button').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-label'))));throw error}finally{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r))}
