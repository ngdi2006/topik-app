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
let selectedPage=35,selectedVolume=1
const server=http.createServer((req,res)=>{if(req.url==='/bundle'){res.end(bundle.outputFiles[0].contents);return}if(req.url==='/css'){res.setHeader('content-type','text/css');res.end(css);return}if(req.url==='/image'){res.setHeader('content-type','image/webp');createReadStream(`tmp/workbooks-2025/eps-topik-2025-workbook-${selectedVolume}/${String(selectedPage).padStart(4,'0')}.webp`).pipe(res);return}const p=plans[selectedVolume-1].pages.find(p=>p.pageNumber===selectedPage);res.setHeader('content-type','text/html');res.end(`<html><head><meta charset=utf-8><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/css"/></head><body><div id="root"></div><script>window.fixture=${JSON.stringify({page:selectedPage,workbook:p.workbook})}</script><script src="/bundle"></script></body></html>`)})
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`

let browser
try{
 browser=await chromium.launch({channel:'msedge',headless:true})
 const page=await browser.newPage({hasTouch:true})
 const expected=[[[343,321],[438,321]],[[508,394],[547,394]],[[441,468],[481,468]],[[442,542],[528,542]],[[504,615],[548,615]]]
 for(const width of [1200,390,320]){
  await page.setViewportSize({width,height:1000});await page.goto(base)
  await page.locator('[data-choice-option]').first().waitFor()
  await page.waitForFunction(()=>document.querySelector('[data-sheet]>img').naturalWidth>0)
  const sheet=await page.locator('[data-sheet]>img').boundingBox()
  for(let row=0;row<5;row++)for(let col=0;col<2;col++){
   const [x,y]=expected[row][col]
   await page.mouse.click(sheet.x+x/1440*sheet.width,sheet.y+y/1864*sheet.height)
   const option=page.locator('[data-workbook-field="p35-f'+(row+1)+'"][data-choice-option="'+(col+1)+'"]')
   assert.equal(await option.getAttribute('aria-pressed'),'true')
   const marker=await option.locator('[data-choice-marker]').boundingBox()
   assert.ok(Math.abs(marker.y+marker.height/2-(sheet.y+y/1864*sheet.height))<2)
  }
  await page.reload();await page.locator('[data-choice-option]').first().waitFor()
  for(let row=0;row<5;row++)assert.equal(await page.locator('[data-workbook-field="p35-f'+(row+1)+'"][data-choice-option="2"]').getAttribute('aria-pressed'),'true')
  await page.screenshot({path:'reports/workbook-word-choice-35-'+width+'.png',fullPage:true})
 }
 console.log('PASS: all 10 printed word positions select correct answers; marker alignment and reload at 1200/390/320px')
}finally{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r))}
