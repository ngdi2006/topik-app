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
const checks=[],errors=[]
let browser
try {
  browser=await chromium.launch({channel:"msedge",headless:true,args:["--mute-audio"]})
  for(const width of [320,390,768,1440]){
    const page=await browser.newPage({viewport:{width,height:900},isMobile:width<768,hasTouch:width<768})
    await page.addInitScript(()=>localStorage.setItem("workbook-guide:v1:00000000-0000-4000-a000-000000000001","done"))
    page.on('pageerror',error=>errors.push(error.message))
    for(const lesson of (smoke ? [28] : Array.from({length:60},(_,index)=>index+1))){
      const manifest=manifests.get(lesson),volume=lesson<=30?1:2
      await page.goto(`${base}/read?volume=${volume}&page=${manifest.segments[0].pageNumber}`)
      await page.getByRole("button",{name:"Bật/tắt làm bài trên sách",exact:true}).click()
      await page.waitForFunction(count=>document.querySelectorAll('[data-audio-group]').length===count,manifest.segments.length)
      const interaction=page.getByRole('button',{name:'Bật/tắt làm bài trên sách',exact:true})
      if(await interaction.getAttribute('aria-pressed')!=='true') await interaction.click()
      await page.locator('[aria-label^="Bài tập tương tác trang"]').first().waitFor()
      await page.evaluate(()=>document.querySelectorAll('[data-page-canvas] img').forEach(img=>{img.loading='eager'}))
      await page.waitForFunction(()=>[...document.querySelectorAll('[data-page-canvas] img')].every(img=>img.complete&&img.naturalWidth>0))
      const metrics=await page.evaluate(()=>{
        const issues=[]
        for(const button of document.querySelectorAll('[data-audio-group]')){
          const b=button.getBoundingClientRect(),scan=button.closest('[data-page]').querySelector('[data-page-canvas]').getBoundingClientRect()
          const titleX=scan.x+Number(button.dataset.headingX)*scan.width,titleY=scan.y+Number(button.dataset.headingY)*scan.height
          if(b.right>titleX-1)issues.push('speaker overlaps printed title')
          if(Math.abs(b.y+b.height/2-titleY)>.7)issues.push('speaker is not centered on title')
          if(b.x<scan.x-.5||b.y<scan.y-.5||b.bottom>scan.bottom+.5)issues.push('speaker outside page')
          if(Math.abs(b.height-b.width)>.5||b.height<25.5||b.height>40.5)issues.push('speaker is not a compact circle')
        }
        if(document.querySelector('[data-page-answer-list]'))issues.push('large answer list was not removed')
        if(!Number(document.querySelector('[data-reader-dock] [data-waveform]')?.dataset.waveformPoints))issues.push('footer waveform has no real peaks')
        for(const overlay of document.querySelectorAll('[aria-label^="Bài tập tương tác trang"]')){
          const a=overlay.getBoundingClientRect(),b=overlay.closest('[data-page-canvas]').getBoundingClientRect()
          if(Math.abs(a.y-b.y)>.6||Math.abs(a.height-b.height)>.6||Math.abs(a.width-b.width)>.6)issues.push('answer overlay shifted relative to scan')
        }
        const dock=document.querySelector('[data-reader-dock]').getBoundingClientRect(),scroll=document.querySelector('[data-reader-scroll]').getBoundingClientRect()
        if(dock.top<scroll.bottom-.6)issues.push('dock covers reading area')
        if(document.documentElement.scrollWidth>innerWidth+1)issues.push('document horizontal overflow')
        return issues
      })
      assert.deepEqual(metrics,[],`B${lesson} at ${width}px: ${metrics.join(', ')}`)
      checks.push({lesson,width,groups:manifest.segments.length,status:'passed'})
      if(lesson%20===0) console.log(`${width}px: checked lessons 1–${lesson}`)
    }
    // Reproduce the supplied B28 view, including active playback and zoom/pan.
    await page.goto(`${base}/read?volume=1&page=252`)
    await page.getByRole("button",{name:"Bật/tắt làm bài trên sách",exact:true}).click()
    await page.locator('[data-audio-group="s900002"]').waitFor()
    await page.locator('[data-audio-group="s900002"]').click()
    await page.waitForFunction(()=>!document.querySelector('audio').paused)
    const footerWave=page.getByRole('slider',{name:'Sóng âm cuối trang',exact:true})
    assert.ok((await page.locator('[data-reader-mini-player]').boundingBox()).height<=60,'Compact player must fit one row on mobile and desktop')
    assert.ok((await page.locator('[data-reader-dock]').boundingBox()).height<=48,'Footer audio and navigation must share one compact row')
    assert.equal(await page.locator('[data-reader-dock]').evaluate(element=>getComputedStyle(element).backgroundColor),'rgba(0, 0, 0, 0)','Footer background must remain transparent')
    await page.getByRole('button',{name:'Xem lời thoại đang nghe',exact:true}).click()
    assert.equal((await page.locator('[data-footer-transcript] [data-structured-transcript]').innerText()).replace(/[\s.,:]/g,''),manifests.get(28).segments[1].text_ko.replace(/[\s.,:]/g,''))
    await page.getByRole('button',{name:'Đóng lời thoại',exact:true}).click()
    await page.getByRole('button',{name:'Tạm dừng âm thanh',exact:true}).click()
    const waveBox=await footerWave.boundingBox()
    const group2=manifests.get(28).segments[1],groupDuration=group2.clipEnd-group2.clipStart
    await page.mouse.click(waveBox.x+waveBox.width*.25,waveBox.y+waveBox.height/2)
    await page.waitForFunction(expected=>Math.abs(document.querySelector('audio').currentTime-expected)<.5,groupDuration*.25)
    assert.equal(await page.locator('audio').evaluate(audio=>audio.paused),true,'Seeking a paused waveform must not autoplay')
    await footerWave.press('ArrowRight')
    await page.waitForFunction(expected=>Math.abs(document.querySelector('audio').currentTime-expected)<.5,groupDuration*.25+1)
    await page.mouse.move(waveBox.x+waveBox.width*.2,waveBox.y+waveBox.height/2)
    await page.mouse.down();await page.mouse.move(waveBox.x+waveBox.width*.7,waveBox.y+waveBox.height/2,{steps:5});await page.mouse.up()
    await page.waitForFunction(expected=>Math.abs(document.querySelector('audio').currentTime-expected)<.5,groupDuration*.7)
    assert.equal(Number(await footerWave.getAttribute('data-waveform-points')),group2.waveform.length)
    await page.screenshot({path:`reports/workbook-reader-layout-${width}.png`})
    await page.getByRole('button',{name:'Phóng to',exact:true}).click()
    await page.getByRole('button',{name:'Phóng to',exact:true}).click()
    assert.equal(await page.getByRole('button',{name:'Vừa chiều rộng trang',exact:true}).innerText(),'150%')
    await page.locator('[data-reader-scroll]').evaluate(element=>{element.scrollTo({left:80,behavior:'instant'})})
    const pan=await page.locator('[data-reader-scroll]').evaluate(element=>({overflow:element.scrollWidth>element.clientWidth,position:element.scrollLeft}))
    if(width<768){assert.ok(pan.overflow&&pan.position>0,'Mobile zoom must support horizontal panning')}
    await page.getByRole('button',{name:'Vừa chiều rộng trang',exact:true}).click()
    if(width<1280){await page.getByRole('button',{name:'Mở file nghe',exact:true}).click();await page.getByRole('dialog').waitFor()}
    const panel=width<1280?page.getByRole('dialog').locator('[data-workbook-listening]'):page.locator('aside [data-workbook-listening]')
    if(width<1280)await page.waitForFunction(()=>{const rect=document.querySelector('[role="dialog"] [data-workbook-listening]')?.getBoundingClientRect();return rect&&rect.right<=innerWidth+.5})
    for(const name of ['Lùi 5 giây','Tiến 5 giây','Lặp lại đoạn đang nghe']) assert.ok((await panel.getByRole('button',{name,exact:true}).boundingBox()).height>=44)
    assert.ok((await panel.getByRole('combobox',{name:'Tốc độ nghe',exact:true}).boundingBox()).height>=44)
    assert.ok((await panel.getByRole('slider',{name:'Thanh thời gian nghe',exact:true}).boundingBox()).height>=44)
    const panelBox=await panel.boundingBox()
    assert.ok(panelBox.x>=-.5&&panelBox.x+panelBox.width<=width+.5,JSON.stringify({panelBox,width}))
    const masterWave=panel.getByRole('slider',{name:'Thanh thời gian nghe',exact:true})
    const firstCard=panel.locator('[data-listening-card="s900001"]')
    assert.ok((await firstCard.boundingBox()).height<155,'Group cards must remain compact while transcript is closed')
    await firstCard.locator('summary').click()
    assert.equal(await firstCard.locator('details').getAttribute('open'),'')
    assert.equal((await firstCard.locator('[data-structured-transcript]').innerText()).replace(/[\s.,:]/g,''),manifests.get(28).segments[0].text_ko.replace(/[\s.,:]/g,''))
    assert.ok(await firstCard.locator('[data-structured-transcript] section').count()>1)
    await page.screenshot({path:`reports/workbook-reader-transcript-${width}.png`})
    await firstCard.locator('summary').click()
    assert.ok(Math.abs(Number(await masterWave.getAttribute('data-waveform-progress'))-.7)<.01,'Footer and summary must share progress')
    const group1Wave=panel.getByRole('slider',{name:'Sóng âm nhóm [1 - 3]',exact:true})
    const group1=manifests.get(28).segments[0],group1Duration=group1.clipEnd-group1.clipStart
    await group1Wave.evaluate(element=>element.scrollIntoView({block:'nearest',behavior:'instant'}))
    const cardBox=await group1Wave.boundingBox()
    await page.mouse.click(cardBox.x+cardBox.width*.35,cardBox.y+cardBox.height/2)
    await page.waitForFunction(expected=>document.querySelector('audio').getAttribute('src').includes('clip=s900001')&&Math.abs(document.querySelector('audio').currentTime-expected)<1,group1Duration*.35)
    await page.waitForFunction(()=>!document.querySelector('audio').paused)
    if(width<1280)await page.getByRole('dialog').getByRole('button',{name:'Đóng nội dung liên kết',exact:true}).click()
    await page.getByRole('button',{name:'Tạm dừng âm thanh',exact:true}).click()
    assert.ok(Math.abs(Number(await footerWave.getAttribute('data-waveform-progress'))-.35)<.02,'Seeking an inactive group must switch the shared player at the chosen offset')
    await page.screenshot({path:`reports/workbook-reader-waveform-footer-${width}.png`})
    if(width<1280){await page.getByRole('button',{name:'Mở file nghe',exact:true}).click();await page.waitForFunction(()=>{const rect=document.querySelector('[role="dialog"] [data-workbook-listening]')?.getBoundingClientRect();return rect&&rect.right<=innerWidth+.5})}
    await panel.getByRole('button',{name:'Nghe cả bài',exact:true}).click()
    await page.waitForFunction(()=>!document.querySelector('audio').getAttribute('src').includes('clip=')&&!document.querySelector('audio').paused)
    await page.waitForFunction(count=>Number(document.querySelector('[data-reader-dock] [data-waveform]').dataset.waveformPoints)===count,manifests.get(28).waveform.length)
    await page.locator('[data-reader-scroll]').evaluate(element=>element.scrollTo({top:0,behavior:'instant'}))
    await firstCard.getByRole('button',{name:'Nghe hướng dẫn nhóm [1 - 3]',exact:true}).click()
    await page.waitForFunction(()=>{const reader=document.querySelector('[data-reader-scroll]');const target=document.querySelector('[data-audio-group="s900001"]');const box=target.getBoundingClientRect(),view=reader.getBoundingClientRect();return reader.scrollTop>100 && box.top>=view.top && box.bottom<=view.bottom})
    await page.screenshot({path:`reports/workbook-reader-audio-panel-${width}.png`})
    if(width<1280)await page.getByRole('dialog').getByRole('button',{name:'Đóng nội dung liên kết',exact:true}).click()
    // All answers are entered directly on the image, as requested.
    const choicePage=definitions.get('layout-unit-28').find(item=>item.pageNumber===252)
    const choice=choicePage.workbook.fields.find(field=>field.kind==='choice'&&!field.is_context)
    const choiceAction=page.locator(`[data-page="252"] button[data-workbook-field="${choice.id}"]`).first()
    const oldPressed=await choiceAction.getAttribute('aria-pressed')
    const saveChoice=page.waitForResponse(res=>res.url().endsWith('/workbook')&&res.request().method()==='POST')
    await choiceAction.click();await saveChoice
    assert.equal(saved.get(`252:${choice.id}`).value,oldPressed==='true'?'':choice.options[0].id)
    await page.screenshot({path:`reports/workbook-reader-answers-${width}.png`})
    for(const kind of ['text','match']){
      const definition=definitions.get('layout-unit-1').find(item=>item.workbook.fields.some(field=>field.kind===kind&&!field.is_context))
      const field=definition.workbook.fields.find(field=>field.kind===kind&&!field.is_context)
      await page.goto(`${base}/read?volume=1&page=${definition.pageNumber}`)
      await page.getByRole("button",{name:"Bật/tắt làm bài trên sách",exact:true}).click()
      const save=page.waitForResponse(res=>res.url().endsWith('/workbook')&&res.request().method()==='POST')
      if(kind==='text'){
        if(width<640){
          await page.locator(`[data-page="${definition.pageNumber}"] button[data-workbook-field="${field.id}"]`).click()
          await page.getByRole('textbox',{name:'Nhập câu trả lời',exact:true}).fill(`확인 ${width}`)
        }else await page.locator(`[data-page="${definition.pageNumber}"] textarea[data-workbook-field="${field.id}"]`).fill(`확인 ${width}`)
        await save
        assert.equal(saved.get(`${definition.pageNumber}:${field.id}`).value,`확인 ${width}`)
      }else{
        const source=field.sources.find(source=>!source.is_context)
        const current=saved.get(`${definition.pageNumber}:${field.id}`)?.value?.[source.id]
        const targets=field.targets.filter(target=>!target.is_context)
        const target=targets.find(target=>target.id!==current)
        await page.locator(`[data-page="${definition.pageNumber}"] button[data-workbook-field="${field.id}"][data-match-port="source"]`).first().click()
        await page.locator(`[data-page="${definition.pageNumber}"] button[data-workbook-field="${field.id}"][data-match-port="target"]`).nth(targets.indexOf(target)).click()
        await save
        assert.equal(saved.get(`${definition.pageNumber}:${field.id}`).value[source.id],target.id)
      }
    }
    await page.getByRole('button',{name:'Chấm bài',exact:true}).click()
    await page.getByRole('combobox',{name:'Giáo viên nhận bài',exact:true}).selectOption('00000000-0000-4000-a000-000000000003')
    const manualSubmission=page.waitForResponse(response=>response.url().endsWith('/workbook/submit')&&response.request().method()==='POST')
    await page.getByRole('button',{name:/^Nộp( cho giáo viên| lại phần này)$/}).click()
    assert.equal((await manualSubmission).request().postDataJSON().section,'vocabulary')
    await page.getByText('Trạng thái: Chờ chấm.',{exact:true}).waitFor()
    await page.screenshot({path:`reports/workbook-submitted-vocabulary-${width}.png`})
    await page.getByRole('button',{name:'Nghe hiểu',exact:true}).click()
    await page.getByRole('button',{name:'Nộp trắc nghiệm · Xem đúng/sai',exact:true}).click()
    await page.getByText('2/2 câu đúng',{exact:true}).waitFor()
    await page.getByRole('button',{name:'Đọc hiểu',exact:true}).click()
    await page.getByRole('button',{name:'Nộp trắc nghiệm · Xem đúng/sai',exact:true}).click()
    await page.getByText('5/5 câu đúng',{exact:true}).waitFor()
    await page.getByRole('button',{name:'Nghe hiểu',exact:true}).click()
    await page.getByText('2/2 câu đúng',{exact:true}).waitFor()
    await page.waitForFunction(()=>{const box=document.querySelector('[role="dialog"]')?.getBoundingClientRect();return box&&box.left>=0&&box.right<=innerWidth+1})
    await page.screenshot({path:`reports/workbook-grading-${width}.png`})
    await page.getByRole('dialog').getByRole('button',{name:'Close',exact:true}).click()
    assert.ok(await page.locator('[aria-label$=": Đúng"]').count()>0,'Grading must mark correct questions on the workbook image')
    await page.goto(`${base}/read?volume=1&page=21`)
    await page.getByRole("button",{name:"Bật/tắt làm bài trên sách",exact:true}).click()
    await page.waitForFunction(()=>document.querySelectorAll('[data-audio-group]').length===3)
    await page.evaluate(()=>document.querySelectorAll('[data-page-canvas] img').forEach(img=>{img.loading='eager'}))
    await page.waitForFunction(()=>[...document.querySelectorAll('[data-page-canvas] img')].every(img=>img.complete&&img.naturalWidth>0))
    await page.locator('[data-page="21"]').evaluate(element=>element.scrollIntoView({block:'start',behavior:'instant'}))
    await page.locator('main > section > header').getByText('Trang 21',{exact:true}).waitFor()
    await page.screenshot({path:`reports/workbook-reader-title-speakers-b1-${width}.png`})
    await page.goto(`${base}/teacher`)
    await page.locator('details').first().locator('summary').click()
    await page.locator('details').first().getByRole('spinbutton').fill('1')
    await page.locator('details').first().getByRole('textbox').fill('Đã nhận và chấm bài thử nghiệm.')
    await page.locator('details').first().getByRole('button',{name:'Lưu kết quả chấm',exact:true}).click()
    await page.getByText(/1\/\d+ · Đã chấm/).first().waitFor()
    await page.screenshot({path:`reports/workbook-teacher-review-${width}.png`})
    await page.goto(`${base}/read?volume=1&page=21`)
    await page.getByRole("button",{name:"Bật/tắt làm bài trên sách",exact:true}).click()
    await page.getByRole('button',{name:'Chấm bài',exact:true}).click()
    await page.getByText('Giáo viên đã chấm',{exact:true}).waitFor()
    await page.getByText('Đã nhận và chấm bài thử nghiệm.',{exact:true}).waitFor()
    await page.getByRole('dialog').getByRole('button',{name:'Close',exact:true}).click()
    await page.route('**/api/audio/**',async route=>{
      if(!new URL(route.request().url()).searchParams.has('segments')){await route.continue();return}
      const response=await route.fetch(),data=await response.json()
      await route.fulfill({json:{...data,canViewTranscript:false,answerGuide:[],segments:data.segments.map(segment=>({...segment,text_ko:'',text_vi:''}))}})
    })
    await page.goto(`${base}/read?volume=1&page=21`)
    await page.getByRole("button",{name:"Bật/tắt làm bài trên sách",exact:true}).click()
    await page.locator('[data-audio-group="s900001"]').waitFor()
    assert.equal(await page.locator('[data-reader-mini-player]').count(),0,'Learners must not see the bottom player')
    assert.equal(await page.getByRole('button',{name:'Xem lời thoại đang nghe',exact:true}).count(),0)
    assert.equal(await page.getByText('Chỉnh vùng làm bài',{exact:true}).count(),0)
    const dock=await page.locator('[data-reader-dock]').boundingBox(),nav=await page.getByRole('navigation',{name:'Chuyển bài học',exact:true}).boundingBox()
    assert.ok(Math.abs((dock.x+dock.width/2)-(nav.x+nav.width/2))<1,'Learner lesson navigation must stay centered')
    await page.screenshot({path:`reports/workbook-learner-footer-${width}.png`})
    await page.getByRole('button',{name:'Mở file nghe',exact:true}).click()
    const learnerPanel=width<1280?page.getByRole('dialog').locator('[data-workbook-listening]'):page.locator('aside [data-workbook-listening]')
    await learnerPanel.getByRole('button',{name:'Nghe nhóm [1 - 4]',exact:true}).waitFor()
    assert.equal(await learnerPanel.locator('[data-group-transcript]').count(),0,'Learners must not see transcript controls')
    await learnerPanel.getByRole('button',{name:'Nghe nhóm [1 - 4]',exact:true}).click()
    await page.waitForFunction(()=>!document.querySelector('audio').paused)
    await page.close()
    console.log(`PASS ${width}px: ${smoke?'B28':'all 60 lessons'}, circular speakers beside titles, direct image answers, reserved dock and zoom`)
  }
  assert.deepEqual(errors,[])
  await writeFile(`reports/workbook-reader-layout-${smoke?'smoke':'audit'}.json`,JSON.stringify({checks,errors,viewports:[320,390,768,1440],directImageAnswers:{choice:true,text:true,matching:true},circularSpeakersAtPrintedTitles:true,zoomAndHorizontalPan:true,audioPanelTouchTargets:true},null,2))
} finally {await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve))}
