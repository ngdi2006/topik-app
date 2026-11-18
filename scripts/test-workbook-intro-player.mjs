import assert from "node:assert/strict"
import { readFile, mkdir, writeFile } from "node:fs/promises"
import http from "node:http"

import { build } from "../tmp/workbook-validation/node_modules/esbuild/lib/main.js"
import { chromium } from "../tmp/workbook-validation/node_modules/playwright/index.mjs"

const root = "tmp/workbook-validation"
const prepared=JSON.parse(await readFile("tmp/workbook-listening-intro/prepared.json","utf8")); const byLesson=new Map(prepared.units.map(u=>[u.unit_number,u]))
const lessons = [-2,-1,0]
await mkdir(root, { recursive: true })
await writeFile(`${root}/group-player.jsx`, `import React from 'react';import {createRoot} from 'react-dom/client';import {useWorkbookListening,buildCanonicalGroups} from '../../src/components/textbooks/useWorkbookListening';
const lesson=Number(new URLSearchParams(location.search).get('lesson'));const resource={id:'test',title:'B'+lesson,resource_url:'/audio/'+lesson};
function App(){const c=useWorkbookListening(resource,null);window.player=c;const groups=buildCanonicalGroups([],c.segments);window.groups=groups;return <><h1>B{lesson}: nhóm câu</h1><audio ref={c.audioRef} src={c.audioUrl||undefined} preload="metadata" onLoadedMetadata={c.handleLoadedMetadata} onTimeUpdate={c.handleTimeUpdate} onEnded={c.handleEnded} onPlay={()=>c.setIsPlaying(true)} onPause={()=>c.setIsPlaying(false)}/>{groups.map(g=><button key={g.id} onClick={()=>c.playGroup(g)}>{g.rangeLabel}</button>)}<button onClick={c.playFull}>Full</button></>};createRoot(document.getElementById('root')).render(<App/>);`)
const bundle = await build({ entryPoints: [`${root}/group-player.jsx`], bundle: true, write: false, format: "iife", jsx: "automatic", define: { "process.env.NODE_ENV": '"development"' } })
const manifests = new Map()
for (const lesson of lessons) manifests.set(lesson, JSON.parse(await readFile(`tmp/workbook-listening-intro/${byLesson.get(lesson).key}/web-manifest.json`, "utf8")))
const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, "http://localhost")
    if (url.pathname === "/bundle.js") { response.setHeader("content-type", "text/javascript"); response.end(bundle.outputFiles[0].text); return }
    const match = /^\/audio\/(-?\d{1,2})$/.exec(url.pathname)
    if (match) {
      const lesson = Number(match[1]); const manifest = manifests.get(lesson)
      if (url.searchParams.has("segments")) { response.setHeader("content-type", "application/json"); response.end(JSON.stringify({ segments: manifest.segments.map(segment => ({ ...segment, audio_url: `/audio/${lesson}?clip=${segment.id}` })), answerGuide: [] })); return }
      const segment = manifest.segments.find(item => item.id === url.searchParams.get("clip"))
      const file = segment ? byLesson.get(lesson).groups[manifest.segments.indexOf(segment)].file : byLesson.get(lesson).fullFile
      const bytes = await readFile(file)
      const range = /^bytes=(\d+)-(\d*)$/.exec(request.headers.range || "")
      response.setHeader("content-type", "audio/mpeg"); response.setHeader("accept-ranges", "bytes")
      if (range) { const start = Number(range[1]); const end = range[2] ? Math.min(Number(range[2]), bytes.length - 1) : bytes.length - 1; response.writeHead(206, { "content-range": `bytes ${start}-${end}/${bytes.length}`, "content-length": end - start + 1 }); response.end(bytes.subarray(start, end + 1)) }
      else { response.setHeader("content-length", bytes.length); response.end(bytes) }
      return
    }
    response.setHeader("content-type", "text/html; charset=utf-8"); response.end('<div id="root"></div><script src="/bundle.js"></script>')
  } catch (error) { response.writeHead(500); response.end(error.message) }
})
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve))
let browser
try {
  browser = await chromium.launch({ headless: true, channel: "msedge" })
  const page = await browser.newPage()
  for (const lesson of lessons) {
    await page.goto(`http://127.0.0.1:${server.address().port}/?lesson=${lesson}`)
    await page.waitForFunction(count => window.groups?.length === count && document.querySelector('audio').readyState >= 1, manifests.get(lesson).segments.length)
    assert.deepEqual(await page.evaluate(() => window.groups.map(group => [group.startQ, group.endQ])), manifests.get(lesson).segments.map(segment => [segment.questionNumber, segment.questionEndNumber]))
    for (let index = 0; index < manifests.get(lesson).segments.length; index++) {
      await page.locator('button').nth(index).click()
      await page.waitForFunction(() => window.player.isPlaying && document.querySelector('audio').readyState >= 2)
      const data = await page.evaluate(() => ({ src: document.querySelector('audio').getAttribute('src'), time: document.querySelector('audio').currentTime, duration: document.querySelector('audio').duration }))
      assert.equal(data.src, `/audio/${lesson}?clip=s90000${index+1}`)
      assert.ok(data.time < 2, 'Group starts at beginning of its clip')
      assert.ok(Math.abs(data.duration - (manifests.get(lesson).segments[index].clipEnd - manifests.get(lesson).segments[index].clipStart)) < 0.15)
      await page.evaluate(() => { const audio=document.querySelector('audio'); audio.currentTime=audio.duration-0.1 })
      await page.waitForFunction(() => !window.player.isPlaying)
    }
    await page.getByRole('button', { name: 'Full', exact: true }).click()
    await page.waitForFunction(() => window.player.isPlaying && !document.querySelector('audio').getAttribute('src').includes('clip='))
    console.log(`PASS B${lesson}: ${manifests.get(lesson).segments.length} real MP3 groups start, stop, and switch back to full audio`)
  }
} finally { await browser?.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)) }
