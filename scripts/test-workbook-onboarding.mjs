// Real reader + local workbook images/audio; no external accounts or writes.
import assert from "node:assert/strict"
import { readFile, writeFile, mkdir, stat } from "node:fs/promises"
import { createReadStream } from "node:fs"
import path from "node:path"
import http from "node:http"
import { build } from "../tmp/workbook-validation/node_modules/esbuild/lib/main.js"
import { chromium } from "../tmp/workbook-validation/node_modules/playwright/index.mjs"
import { compile } from "@tailwindcss/node"
import { Scanner } from "@tailwindcss/oxide"
import sharp from "sharp"

const root = "tmp/workbook-validation"
const smoke = process.argv.includes("--smoke")
await mkdir(root, { recursive: true })
await writeFile(`${root}/reader-layout.jsx`, `import React from 'react';import {createRoot} from 'react-dom/client';import Reader from '../../src/components/textbooks/TextbookReader';import Teacher from '../../src/app/admin/textbooks/submissions/page';const p=new URLSearchParams(location.search);createRoot(document.getElementById('root')).render(location.pathname==='/teacher'?<Teacher/>:<Reader bookId={'layout-book-'+p.get('volume')} initialPage={Number(p.get('page'))}/>);`)
const bundle = await build({ entryPoints: [`${root}/reader-layout.jsx`], bundle: true, write: false, format: "iife", jsx: "automatic", define: { "process.env.NODE_ENV": '"development"' }, plugins: [{ name: "next-fixture", setup(builder) {
  builder.onResolve({ filter: /^next\/(image|link)$/ }, args => ({ path: args.path, namespace: "fixture" }))
  builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path.endsWith("image") ? "import React from 'react';export default function Image({unoptimized,priority,fill,sizes,...props}){return <img {...props}/>;}" : "import React from 'react';export default function Link(props){return <a {...props}/>;}", loader: "jsx", resolveDir: process.cwd() }))
} }] })
const compiler = await compile(await readFile("src/app/globals.css", "utf8"), { base: path.resolve("src/app"), onDependency() {} })
const css = compiler.build(new Scanner({ sources: [{ base: path.resolve("src"), pattern: "**/*.{tsx,ts}", negated: false }] }).scan())
const toc = JSON.parse(await readFile("reports/workbook-toc.json", "utf8"))
const books = toc.books.map((book, index) => ({ id: `layout-book-${index+1}`, code: book.code, title_vi: `Sách bài tập EPS-TOPIK · Quyển ${index+1}`, volume: index+1, edition: "2025", total_pages: book.pages, units: book.units.filter(unit => unit.unit_number > 0).map(unit => ({ ...unit, id: `layout-unit-${unit.unit_number}` })) }))
const definitions = new Map(), manifests = new Map()
for (const book of books) {
  let aligned
  try { aligned = JSON.parse(await readFile(`tmp/workbook-choice-rows/${book.code}/planned.json`, "utf8")) } catch {}
  for (const unit of book.units) {
    const pages = []
    for (let pageNumber = unit.start_page; pageNumber <= unit.end_page; pageNumber++) {
      const dimensions = await sharp(`tmp/workbooks-2025/${book.code}/${String(pageNumber).padStart(4,"0")}.webp`).metadata()
      pages.push({ pageNumber, width:dimensions.width, height:dimensions.height, workbook: aligned?.pages.find(page => page.pageNumber === pageNumber)?.workbook || JSON.parse(await readFile(`tmp/workbook-interactions/${book.code}/${String(pageNumber).padStart(4,"0")}.json`, "utf8")) })
    }
    definitions.set(unit.id, pages)
    manifests.set(unit.unit_number, JSON.parse(await readFile(`tmp/workbook-listening-elevenlabs/B${unit.unit_number}/question-groups/web-manifest.json`, "utf8")))
  }
}
const saved = new Map()
const submittedParts = new Map()
const teacherQueue = new Map()
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://fixture")
    const json = data => { res.setHeader("content-type", "application/json"); res.end(JSON.stringify(data)) }
    if (url.pathname === "/textbooks/tutorial/listening-example.mp3") { res.setHeader("content-type", "audio/mpeg"); res.end(await readFile("public/textbooks/tutorial/listening-example.mp3")); return }
    if (url.pathname === "/fixture.js") { res.setHeader("content-type", "text/javascript"); res.end(bundle.outputFiles[0].contents); return }
    if (url.pathname === "/fixture.css") { res.setHeader("content-type", "text/css"); res.end(css); return }
    if (url.pathname === "/api/textbooks") { json({ books }); return }
    if(url.pathname==='/api/admin/textbooks/submissions'){
      if(req.method==='PATCH'){
        let body='';for await(const chunk of req)body+=chunk
        const input=JSON.parse(body),row=teacherQueue.get(input.id)
        const total=row.content.answers.reduce((sum,answer)=>sum+(answer.kind==='match'?answer.sources.length:1),0)
        const review={correct:input.correct,total,feedback:input.feedback,teacherId:row.teacherId,reviewedAt:new Date().toISOString()}
        row.content.status='reviewed';row.content.review=review
        const summary=submittedParts.get(`${row.content.unitId}:${row.content.section}`);summary.status='reviewed';summary.review=review
        json({ok:true,review});return
      }
      json({submissions:[...teacherQueue.values()].reverse(),hasMore:false});return
    }
    if (url.pathname.endsWith("/workbook/submit")) {
      if(req.method==='POST'){
        let body='';for await(const chunk of req)body+=chunk
        const input=JSON.parse(body), submission={id:input.requestId,section:input.section,status:'pending',submittedAt:new Date().toISOString(),teacherId:input.teacherId,review:null}
        submittedParts.set(`${input.unitId}:${input.section}`,submission)
        const answers=(definitions.get(input.unitId)||[]).flatMap(page=>page.workbook.fields.filter(field=>!field.is_context&&field.section===input.section&&!(field.kind==='choice'&&['reading','listening'].includes(field.section))).map(field=>({pageNumber:page.pageNumber,fieldId:field.id,label:field.label,kind:field.kind,options:field.options,sources:field.sources.filter(node=>!node.is_context),targets:field.targets.filter(node=>!node.is_context),value:input.answers[`${page.pageNumber}:${field.id}`]??(field.kind==='match'?{}:'')})))
        teacherQueue.set(input.requestId,{id:input.requestId,teacherId:input.teacherId,bookId:'layout-book-1',content:{version:1,studentId:'fixture-learner',studentName:'Học viên thử nghiệm',bookTitle:'Sách bài tập',unitId:input.unitId,unitTitle:'Bài 1',section:input.section,status:'pending',submittedAt:submission.submittedAt,answers,review:null}})
        json({ok:true,message:'Đã lưu kết quả và gửi cho giáo viên chấm.',submission});return
      }
      const unitId=url.searchParams.get('unitId')
      json({teachers:[{id:'00000000-0000-4000-a000-000000000003',name:'Giáo viên thử nghiệm'}],submissions:[...submittedParts.entries()].filter(([key])=>key.startsWith(unitId+':')).map(([,value])=>value)});return
    }
    if (url.pathname.endsWith("/workbook/grade")) {
      let body="";for await(const chunk of req)body+=chunk
      const input=JSON.parse(body)
      const fields=(definitions.get(input.unitId)||[]).flatMap(page=>page.workbook.fields.filter(field=>field.kind==='choice'&&!field.is_context&&field.section===input.section).map(field=>({pageNumber:page.pageNumber,fieldId:field.id,label:field.label,section:field.section}))).slice(0,10)
      json({items:fields.map((field,index)=>({...field,status:index<5?'correct':'incorrect',expected:'fixture answer'})),correct:Math.min(5,fields.length),total:fields.length,incorrect:Math.max(0,fields.length-5),unanswered:0,ungraded:0});return
    }
    if (url.pathname.endsWith("/workbook")) {
      if (req.method === "POST") { let body=""; for await (const chunk of req) body+=chunk; for (const answer of JSON.parse(body).answers) saved.set(`${answer.pageNumber}:${answer.fieldId}`, answer); json({ ok:true }); return }
      const id = url.searchParams.get("unitId")
      json({ userId:"00000000-0000-4000-a000-000000000001", canEdit:false, pages:definitions.get(id)||[], answers:[...saved.values()], progress:[] }); return
    }
    const summary = /\/units\/layout-unit-(\d+)\/summary$/.exec(url.pathname)
    if (summary) { const lesson=Number(summary[1]); json({ grammar:[], audio:[{id:`audio-${lesson}`,title:`Bài ${lesson} · File nghe`,resource_url:`/api/audio/${lesson}`}],listening:null }); return }
    const audio = /^\/api\/audio\/(\d+)$/.exec(url.pathname)
    if (audio) {
      const lesson=Number(audio[1]), manifest=manifests.get(lesson)
      if (req.method === "POST") { json({ok:true}); return }
      if (url.searchParams.has("segments")) { json({canViewTranscript:true,duration:manifest.duration,waveform:manifest.waveform,segments:manifest.segments.map(segment=>({...segment,audio_url:`/api/audio/${lesson}?clip=${segment.id}`})),answerGuide:[]}); return }
      if (url.searchParams.has("progress")) {json({seconds:0});return}
      const segment=manifest.segments.find(segment=>segment.id===url.searchParams.get("clip"))
      const file=segment?`tmp/workbook-listening-elevenlabs/B${lesson}/question-groups/${path.basename(segment.audio_path)}`:`tmp/workbook-listening-elevenlabs/B${lesson}/reindexed-full.mp3`
      const {size}=await stat(file), range=/bytes=(\d+)-(\d*)/.exec(req.headers.range||"")
      res.setHeader("content-type","audio/mpeg");res.setHeader("accept-ranges","bytes")
      if(range){const start=Number(range[1]),end=range[2]?Math.min(Number(range[2]),size-1):size-1;res.writeHead(206,{"content-range":`bytes ${start}-${end}/${size}`,"content-length":end-start+1});createReadStream(file,{start,end}).pipe(res)}else{res.setHeader("content-length",size);createReadStream(file).pipe(res)}
      return
    }
    const unit = /\/units\/(layout-unit-\d+)$/.exec(url.pathname)
    if(unit){const volume=Number(/layout-book-(\d+)/.exec(url.pathname)[1]);json({pages:(definitions.get(unit[1])||[]).map(page=>({page_number:page.pageNumber,imageUrl:`/pages/${volume}/${page.pageNumber}.webp`,width:page.width,height:page.height,ocr_payload:{}}))});return}
    const image = /^\/pages\/(\d+)\/(\d+)\.webp$/.exec(url.pathname)
    if(image){res.setHeader("content-type","image/webp");res.end(await readFile(`tmp/workbooks-2025/eps-topik-2025-workbook-${image[1]}/${String(image[2]).padStart(4,"0")}.webp`));return}
    if(url.pathname.startsWith("/api/")){json({ok:true});return}
    res.setHeader("content-type","text/html; charset=utf-8");res.end('<!doctype html><html lang="vi"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"></head><body><div id="root"></div><script src="/fixture.js"></script></body></html>')
  } catch(error){res.writeHead(500);res.end(error.message)}
})
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve))
const base=`http://127.0.0.1:${server.address().port}`
let browser,debugPage;const errors=[]
try{
 browser=await chromium.launch({channel:'msedge',headless:true})
 for(const width of [320,390,1440]){
  const page=await browser.newPage({viewport:{width,height:900},hasTouch:width<768})
  debugPage=page
  page.on('pageerror',error=>errors.push(error.message))
  let answerWrites=0;page.on('request',request=>{if(request.method()==='POST'&&/\/workbook$/.test(new URL(request.url()).pathname))answerWrites++})
  await page.goto(base+'/read?volume=1&page=21')
  const guide=page.locator('[data-workbook-guide]');await guide.waitFor()
  const mode=page.locator('[data-workbook-mode]')
  assert.equal(await mode.getAttribute('aria-pressed'),'false')
  assert.equal(await page.locator('[data-workbook-field]').count(),0)
  await guide.getByRole('button',{name:'Bỏ qua',exact:true}).click();await guide.waitFor({state:'hidden'})
  assert.equal(await mode.getAttribute('aria-pressed'),'false')
  await page.goto(base+'/read?volume=1&page=21');await page.getByRole('button',{name:'Xem hướng dẫn làm bài',exact:true}).first().waitFor()
  assert.equal(await guide.count(),0)
  await page.getByRole('button',{name:'Xem hướng dẫn làm bài',exact:true}).first().click();await guide.waitFor()
  assert.equal(await guide.getAttribute('data-guide-step'),'1')
  await guide.getByRole('button',{name:'Thử bật Làm bài',exact:true}).click()
  await guide.getByRole('button',{name:'Tiếp',exact:true}).click()
  assert.equal(await guide.getAttribute('data-guide-step'),'2')
  await guide.getByRole('group',{name:'Thử chọn đáp án đọc',exact:true}).locator('button').first().click()
  await page.screenshot({path:'reports/workbook-guide-reading-'+width+'.png'})
  const bounds=await guide.boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=width&&bounds.y+bounds.height<=900)
  await guide.getByRole('button',{name:'Tiếp',exact:true}).click()
  await guide.getByRole('button',{name:'Nghe mẫu',exact:true}).click()
  await page.waitForFunction(()=>{const player=document.querySelector('audio[src="/textbooks/tutorial/listening-example.mp3"]');return player&&player.currentTime>0})
  await guide.getByRole('group',{name:'Thử chọn đáp án nghe',exact:true}).locator('button').first().click()
  await page.screenshot({path:'reports/workbook-guide-listening-'+width+'.png'})
  assert.equal(answerWrites,0,'Practice must not save answers into the real lesson')
  assert.equal(await mode.getAttribute('aria-pressed'),'false')
  await guide.getByRole('button',{name:'Bắt đầu làm bài',exact:true}).click();await guide.waitFor({state:'hidden'})
  assert.equal(await mode.getAttribute('aria-pressed'),'true')
  await page.locator('[data-workbook-field]').first().waitFor()
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
  await page.goto(base+'/read?volume=1&page=21');await mode.waitFor();await page.getByRole('button',{name:'Xem hướng dẫn làm bài',exact:true}).first().waitFor()
  assert.equal(await mode.getAttribute('aria-pressed'),'false')
  assert.equal(await guide.count(),0)
  await page.close();console.log('PASS '+width+'px: read mode default, first-visit guide, skip/replay, 3 practice steps, explicit start and no real answer writes')
 }
 assert.deepEqual(errors,[])
}catch(error){await debugPage?.screenshot({path:'reports/workbook-guide-error.png'});console.log(errors);console.log(await debugPage?.locator('header').innerHTML());throw error}finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve))}
