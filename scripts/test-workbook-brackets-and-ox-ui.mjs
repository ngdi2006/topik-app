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

let browser
try{
 browser=await chromium.launch({channel:'msedge',headless:true})
 const page=await browser.newPage({hasTouch:true})
 for(const width of [1200,390,320])for(const number of [10,11]){
  selectedPage=number;await page.setViewportSize({width,height:1400});await page.goto(base);await page.evaluate(()=>localStorage.clear());await page.reload()
  const boxes=page.locator('[data-bracket-input]:visible');await boxes.first().waitFor()
  assert.equal(await boxes.count(),number===10?6:4)
  await page.waitForFunction(()=>document.querySelector('[data-sheet]>img').naturalWidth>0)
  const image=await page.locator('[data-sheet]>img').boundingBox()
  const ys=number===10?[1364,1440,1515,1591,1666,1741]:[191,266,341,417]
  for(let i=0;i<ys.length;i++){
   const box=await boxes.nth(i).boundingBox()
   assert.ok(box.x>image.x+783/1440*image.width&&box.x+box.width<image.x+1020/1440*image.width,'Input stays inside printed square brackets')
   assert.ok(Math.abs(box.y+box.height/2-(image.y+(ys[i]+13)/2037*image.height))<1)
  }
  if(width>=640)await boxes.first().fill('바다요')
  else{await boxes.first().click();const dialog=page.getByRole('dialog');await dialog.locator('textarea').fill('바다요');await dialog.getByRole('button',{name:'Xong',exact:true}).click();await dialog.waitFor({state:'hidden'})}
  if(number===11){
   const groups=page.locator('[data-true-false]');assert.equal(await groups.count(),9)
   assert.equal(await groups.locator('input:checked').count(),0,'O/X starts blank')
   const bounds=await groups.evaluateAll(ns=>ns.map(n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom}}))
   for(let i=0;i<bounds.length;i++)for(let j=i+1;j<bounds.length;j++){const a=bounds[i],b=bounds[j];assert.ok(Math.min(a.right,b.right)-Math.max(a.x,b.x)<=0||Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y)<=0,'Horizontal O/X controls must not overlap')}
   for(let i=0;i<9;i++)await groups.nth(i).getByRole('radio',{name:'X',exact:true}).locator('..').click()
   await groups.first().getByRole('radio',{name:'O',exact:true}).locator('..').click()
   assert.equal(await groups.locator('input:checked').count(),9)
   await groups.first().getByRole('radio',{name:'O',exact:true}).locator('..').click()
   assert.equal(await groups.locator('input:checked').count(),8,'Tap selected compact answer to clear')
   await page.reload();await groups.first().waitFor();assert.equal(await groups.locator('input:checked').count(),8)
  }
  await page.mouse.click(0,0)
  await page.screenshot({path:'reports/workbook-brackets-ox-'+number+'-'+width+'.png',fullPage:true})
 }
 console.log('PASS: all 10 bracket inputs aligned; all 9 horizontal O/X groups blank by default, exclusive, clearable, persisted; no overlaps at 1200/390/320px')
}finally{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r))}
