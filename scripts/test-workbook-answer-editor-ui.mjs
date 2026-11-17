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
try {
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:390,height:800},hasTouch:true});
 for(const width of [320,390,1200])for(const number of [10,239]){
 console.log(width,number);selectedPage=number;await page.setViewportSize({width,height:800});await page.goto(base);const controls=page.locator('button[data-bracket-input]:visible,button[data-workbook-field]:visible').filter({hasNot:page.locator('[data-choice-marker]')});
 const target=number===10?'p10-f2':'p239-f1';if(width<640)await page.locator('button[data-workbook-field='+target+']:visible').click();else await page.locator('input[data-workbook-field='+target+']:visible,textarea[data-workbook-field='+target+']:visible').dblclick();
 const dialog=page.getByRole('dialog');await dialog.waitFor();await page.evaluate(()=>Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{}))));
 let bounds=await dialog.boundingBox();assert.ok(bounds.width<=576);assert.ok(bounds.height<300,'Compact editor');
 const editor=dialog.locator('textarea');await editor.fill('Saved answer');
 if(width<640){
 await page.evaluate(()=>{Object.defineProperty(window.visualViewport,'height',{configurable:true,value:260});Object.defineProperty(window.visualViewport,'offsetTop',{configurable:true,value:35});window.visualViewport.dispatchEvent(new Event('resize'))});
 await page.waitForFunction(()=>{const el=document.querySelector('[data-workbook-answer-editor]');return el&&el.getBoundingClientRect().bottom<=296});
 const area=await editor.boundingBox(),button=await dialog.getByRole('button',{name:'Xong',exact:true}).boundingBox();
 assert.ok(area.y>=35&&area.y+area.height<=295,'Input above keyboard');assert.ok(button.y>=35&&button.y+button.height<=295,'Done above keyboard');
 await page.screenshot({path:'reports/workbook-answer-editor-keyboard-'+number+'-'+width+'.png'});
 await page.evaluate(()=>{delete window.visualViewport.height;delete window.visualViewport.offsetTop;window.visualViewport.dispatchEvent(new Event('resize'))});
 }
 await dialog.getByRole('button',{name:'Xong',exact:true}).click();await dialog.waitFor({state:'hidden'});
 const saved=await page.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('fixture-matches')||'{}')));assert.ok(saved.includes('Saved answer'));
 }
 console.log('PASS: compact editor, simulated mobile keyboard/pan, input and Done remain visible, saved answers at 320/390/1200px');
}finally{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r))}
