import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import http from 'node:http'
import path from 'node:path'
import { build } from '../tmp/workbook-validation/node_modules/esbuild/lib/main.js'
import { chromium } from '../tmp/workbook-validation/node_modules/playwright/index.mjs'
import { compile } from '@tailwindcss/node'
import { Scanner } from '@tailwindcss/oxide'

const root='tmp/workbook-validation'
await writeFile(`${root}/library-entry.jsx`,`import React from 'react';import{createRoot}from'react-dom/client';import Library from '../../src/components/textbooks/TextbookLibrary';createRoot(document.getElementById('root')).render(<Library {...window.fixture} onRetry={()=>{window.retried=true}}/>);`)
const bundle=await build({entryPoints:[`${root}/library-entry.jsx`],bundle:true,write:false,format:'iife',jsx:'automatic',define:{'process.env.NODE_ENV':'"development"'},plugins:[{name:'next-fixture',setup(builder){builder.onResolve({filter:/^next\/(image|link)$/},args=>({path:args.path,namespace:'fixture'}));builder.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:args.path.endsWith('image')?`import React from'react';export default function Image({fill,sizes,priority,unoptimized,...props}){return <img {...props} style={{position:'absolute',height:'100%',width:'100%'}}/>}`:`import React from'react';export default function Link(props){return <a {...props}/>} `,loader:'jsx',resolveDir:process.cwd()}))}}]})
const compiler=await compile(await readFile('src/app/globals.css','utf8'),{base:path.resolve('src/app'),onDependency(){}})
const css=compiler.build(new Scanner({sources:[{base:path.resolve('src'),pattern:'**/*.{tsx,ts}',negated:false}]}).scan())
const toc=JSON.parse(await readFile('reports/workbook-toc.json','utf8'))
const books=[2,1].flatMap(volume=>[true,false].map(workbook=>({id:`${workbook?'workbook':'course'}-${volume}`,code:workbook?`eps-topik-2025-workbook-${volume}`:`eps-topik-2025-${volume}`,title_vi:`${workbook?'Sách bài tập':'Giáo trình'} EPS-TOPIK 2025 - Quyển ${volume}`,title_ko:workbook?`EPS-TOPIK 2025 워크북 ${volume}`:`한국어 표준교재 ${volume}`,volume,edition:'2025',total_pages:workbook?(volume===1?273:270):(volume===1?388:356),coverUrl:workbook?`/cover/${volume}`:null,units:toc.books.find(book=>book.volume===volume||book.code.endsWith('-'+volume)).units,progress:{last_page:volume===1?21:140,progress_percent:workbook?5:18}})))
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://fixture')
  if(url.pathname==='/bundle'){res.end(bundle.outputFiles[0].contents);return}
  if(url.pathname==='/css'){res.setHeader('content-type','text/css');res.end(css);return}
  if(url.pathname.startsWith('/textbooks/covers/')){res.setHeader('content-type','image/png');res.end(await readFile(`public${url.pathname}`));return}
  if(url.pathname.startsWith('/cover/')){const volume=Number(url.pathname.split('/').pop());res.setHeader('content-type','image/webp');res.end(await readFile(`tmp/workbooks-2025/eps-topik-2025-workbook-${volume}/${volume===1?'0001':'0001'}.webp`));return}
  const mode=url.searchParams.get('mode')
  const fixture={books:mode==='empty'?[]:mode==='locked'?books.map(book=>({...book,canAccess:!book.code.includes('-workbook-')})):books,loading:mode==='loading',error:mode==='error'?'Không tải được thư viện.':null}
  res.setHeader('content-type','text/html; charset=utf-8');res.end(`<!doctype html><html lang=vi><head><meta name=viewport content="width=device-width,initial-scale=1"><link rel=stylesheet href=/css><style>body{margin:0;background:#f8fafc}.shell{display:flex;min-height:100vh}.rail{display:none}@media(min-width:1024px){.rail{display:block;width:230px;flex-shrink:0;background:#1d4ed8}}.content{min-width:0;flex:1}header{height:64px;background:white;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;padding:0 24px;font-weight:700}</style></head><body><div class=shell><aside class=rail></aside><div class=content><header>Giáo trình EPS</header><div id=root></div></div></div><script>window.fixture=${JSON.stringify(fixture)}</script><script src=/bundle></script></body></html>`)
 }catch(error){res.writeHead(500);res.end(error.message)}
})
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`
let browser
try{
 browser=await chromium.launch({channel:'msedge',headless:true})
 for(const width of [320,390,768,1024,1440,1920]){
  const page=await browser.newPage({viewport:{width,height:1000}})
  await page.goto(base)
  await page.locator('[data-library-book]').first().waitFor()
  await page.waitForFunction(()=>[...document.querySelectorAll('img')].every(image=>image.complete&&image.naturalWidth>0))
  assert.deepEqual(await page.locator('[data-library-book]').evaluateAll(nodes=>nodes.map(node=>node.dataset.libraryBook)),['course-1','workbook-1','course-2','workbook-2'])
  assert.equal(await page.locator('[data-library-book="course-1"] a').getAttribute('href'),'/textbooks/course-1/read?page=21')
  assert.equal(await page.locator('[data-library-book="workbook-1"]').getByText('30 bài học · 273 trang',{exact:true}).count(),1)
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
  for(const box of await page.locator('[data-library-book] a').evaluateAll(nodes=>nodes.map(node=>({height:node.getBoundingClientRect().height,right:node.getBoundingClientRect().right})))){assert.ok(box.height>=44);assert.ok(box.right<=width)}
  if(width>=1024){const first=await page.locator('[data-library-book="course-1"]').boundingBox(),second=await page.locator('[data-library-book="workbook-1"]').boundingBox();assert.equal(first.y,second.y);assert.ok(first.height<300)}
  await page.screenshot({path:`reports/textbook-library-${width}.png`,fullPage:true})
  await page.getByRole('button',{name:'Sách bài tập',exact:true}).click();assert.equal(await page.locator('[data-library-book]').count(),2)
  await page.getByRole('button',{name:'Giáo trình',exact:true}).click();assert.equal(await page.locator('[data-library-book]').count(),2)
  await page.getByRole('button',{name:'Tất cả',exact:true}).click();assert.equal(await page.locator('[data-library-book]').count(),4)
  await page.close();console.log(`PASS ${width}px: paired volumes, compact cards, filters, resume links and no overflow`)
 }
 const page=await browser.newPage({viewport:{width:390,height:844}})
 await page.goto(base+'/?mode=error');await page.getByRole('button',{name:'Thử lại',exact:true}).click();assert.equal(await page.evaluate(()=>window.retried),true)
 await page.goto(base+'/?mode=empty');await page.getByText('Giáo trình đang được chuẩn bị',{exact:true}).waitFor()
 await page.goto(base+'/?mode=loading');await page.getByRole('status',{name:'Đang tải thư viện',exact:true}).waitFor()
 await page.goto(base+'/?mode=locked');await page.locator('[data-library-book]').first().waitFor()
 assert.equal(await page.locator('[data-library-book] a').count(),2)
 assert.equal(await page.getByText('Cần admin kích hoạt',{exact:true}).count(),2)
 console.log('PASS error/retry, empty and loading states')
}finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve))}
