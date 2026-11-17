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
let selectedPage=21,selectedVolume=1
const server=http.createServer((req,res)=>{if(req.url==='/bundle'){res.end(bundle.outputFiles[0].contents);return}if(req.url==='/css'){res.setHeader('content-type','text/css');res.end(css);return}if(req.url==='/image'){res.setHeader('content-type','image/webp');createReadStream(`tmp/workbooks-2025/eps-topik-2025-workbook-${selectedVolume}/${String(selectedPage).padStart(4,'0')}.webp`).pipe(res);return}const p=plans[selectedVolume-1].pages.find(p=>p.pageNumber===selectedPage);res.setHeader('content-type','text/html');res.end(`<html><head><meta charset=utf-8><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/css"/></head><body><div id="root"></div><script>window.fixture=${JSON.stringify({page:selectedPage,workbook:p.workbook})}</script><script src="/bundle"></script></body></html>`)})
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`

let browser
try {
 browser=await chromium.launch({channel:'msedge',headless:true})
 const page=await browser.newPage({hasTouch:true})
 for(const width of [1200,390,320]) {
  await page.setViewportSize({width,height:1000});await page.goto(base)
  const groups=page.locator('[data-true-false]');await groups.first().waitFor()
  if(await page.getByRole('button',{name:'Xóa chọn',exact:true}).count()) await page.getByRole('button',{name:'Xóa chọn',exact:true}).click()
  assert.equal(await groups.locator('input:checked').count(),0)
  assert.equal(await groups.count(),4)
  assert.equal(await page.locator('[data-true-false-heading]').count(),1)
  assert.equal(await page.locator('textarea[data-workbook-field="p21-f1"]').count(),0)
  await groups.first().getByRole('radio',{name:'O',exact:true}).locator('..').click()
  await groups.nth(1).getByRole('radio',{name:'X',exact:true}).locator('..').tap()
  assert.equal(await groups.nth(1).getByRole('radio',{name:'X',exact:true}).isChecked(),true)
  await groups.first().getByRole('radio',{name:'X',exact:true}).locator('..').click()
  assert.equal(await groups.first().locator('input:checked').count(),1)
  assert.equal(await groups.first().getByRole('radio',{name:'O',exact:true}).isChecked(),false)
  await groups.first().getByRole('radio',{name:'X',exact:true}).focus();await page.keyboard.press('ArrowLeft')
  assert.equal(await groups.first().getByRole('radio',{name:'O',exact:true}).isChecked(),true)
  await page.reload();await groups.first().waitFor()
  assert.equal(await groups.first().getByRole('radio',{name:'O',exact:true}).isChecked(),true)
  assert.equal(await groups.nth(1).getByRole('radio',{name:'X',exact:true}).isChecked(),true)
  await page.getByRole('button',{name:'Xóa chọn',exact:true}).click()
  assert.equal(await groups.locator('input:checked').count(),0)
  await page.reload();await groups.first().waitFor();assert.equal(await groups.locator('input:checked').count(),0)
  await page.screenshot({path:'reports/workbook-true-false-'+width+'.png',fullPage:true})
 }
 const mousePage=await browser.newPage({viewport:{width:1200,height:1000}});await mousePage.goto(base);const cell=mousePage.locator('[data-true-false] label').first();await cell.waitFor();const before=await cell.locator('span').evaluate(el=>getComputedStyle(el).borderColor);await cell.hover();await mousePage.waitForFunction(before=>getComputedStyle(document.querySelector('[data-true-false] label span')).borderColor!==before,before);await mousePage.close()
 console.log('PASS: O/X radios, exclusive selection per question, label taps, keyboard and persistence at desktop/mobile widths')
}finally{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r))}
