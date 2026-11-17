// Isolated browser fixture: real reader/components, fake accounts and API data.
// Never connects to Supabase or changes user answers.
import assert from "node:assert/strict"
import { readFile, mkdir, writeFile, stat } from "node:fs/promises"
import { createReadStream } from "node:fs"
import http from "node:http"
import path from "node:path"
import { build } from "../tmp/workbook-validation/node_modules/esbuild/lib/main.js"
import { chromium } from "../tmp/workbook-validation/node_modules/playwright/index.mjs"
import { compile } from "@tailwindcss/node"
import { Scanner } from "@tailwindcss/oxide"

const root = path.resolve("tmp/workbook-validation")
await mkdir(root, { recursive: true })
const entry = `import React from 'react';import {createRoot} from 'react-dom/client';import Reader from '../../src/components/textbooks/TextbookReader';createRoot(document.getElementById('root')).render(<Reader bookId="fixture-book" initialPage={Number(new URLSearchParams(location.search).get('page')||15)}/>);`
await writeFile(`${root}/entry.jsx`, entry)
const compiled = await build({ entryPoints: [`${root}/entry.jsx`], bundle: true, write: false, format: "iife", jsx: "automatic", define: { "process.env.NODE_ENV": '"development"' }, plugins: [{ name: "next-fixture", setup(builder) {
  builder.onResolve({ filter: /^next\/(image|link)$/ }, args => ({ path: args.path, namespace: "fixture" }))
  builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path.endsWith("image") ? "import React from 'react';export default function Image({unoptimized,priority,fill,sizes,...props}){return <img {...props}/>;}" : "import React from 'react';export default function Link(props){return <a {...props}/>;}", loader: "jsx", resolveDir: process.cwd() }))
} }] })
const compiler = await compile(await readFile("src/app/globals.css", "utf8"), { base: path.resolve("src/app"), onDependency() {} })
const scanner = new Scanner({ sources: [{ base: path.resolve("src"), pattern: "**/*.{tsx,ts}", negated: false }] })
const css = compiler.build(scanner.scan())
const units = [
  { id: "unit1", unit_number: 1, title_ko: "자기소개", title_vi: "Giới thiệu bản thân", start_page: 15, end_page: 21, sort_order: 0 },
  { id: "unit2", unit_number: 2, title_ko: "생활용품", title_vi: "Đồ dùng sinh hoạt", start_page: 22, end_page: 29, sort_order: 1 },
  { id: "unit24", unit_number: 24, title_ko: "은행", title_vi: "Ngân hàng", start_page: 210, end_page: 218, sort_order: 2 },
  { id: "unit4", unit_number: 4, title_ko: "동작과 사물", title_vi: "Hành động và đồ vật", start_page: 37, end_page: 45, sort_order: 3 },
  { id: "unit5", unit_number: 5, title_ko: "날짜와 요일", title_vi: "Ngày tháng", start_page: 46, end_page: 53, sort_order: 4 },
  { id: "unit18", unit_number: 18, title_ko: "취미", title_vi: "Sở thích", start_page: 159, end_page: 167, sort_order: 5 },
]
const definitions = []
const aligned = JSON.parse(await readFile("tmp/workbook-choice-rows/eps-topik-2025-workbook-1/planned.json", "utf8"))
for (const pageNumber of [...Array.from({ length: 15 }, (_, i) => i + 15), ...Array.from({ length: 9 }, (_, i) => i + 37), ...Array.from({ length: 8 }, (_, i) => i + 46), ...Array.from({ length: 9 }, (_, i) => i + 159), ...Array.from({ length: 9 }, (_, i) => i + 210)]) {
  definitions.push({ pageNumber, workbook: aligned.pages.find(page => page.pageNumber === pageNumber)?.workbook || JSON.parse(await readFile(`tmp/workbook-interactions/eps-topik-2025-workbook-1/${String(pageNumber).padStart(4, "0")}.json`, "utf8")) })
}
const book = { id: "fixture-book", code: "eps-topik-2025-workbook-1", title_vi: "Sách bài tập EPS-TOPIK 2025 – Quyển 1", volume: 1, edition: "2025", total_pages: 273, units }
const saved = new Map()
let rejectSave = false
let adminMode = false
let audioSeconds = 0
const clipSeconds = new Map()
let saveDelay = 80
const userId = "00000000-0000-4000-a000-000000000001"
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://fixture")
    const json = data => { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(data)) }
    const body = async () => { let value = ""; for await (const chunk of req) value += chunk; return JSON.parse(value) }
    if (url.pathname === "/fixture.js") { res.setHeader("Content-Type", "text/javascript"); res.end(compiled.outputFiles[0].contents); return }
    if (url.pathname === "/fixture.css") { res.setHeader("Content-Type", "text/css"); res.end(css); return }
    if (url.pathname === "/api/textbooks") { json({ books: [book] }); return }
    if (url.pathname.endsWith("/workbook")) {
      if (req.method === "PATCH") {
        const data = await body()
        assert.ok(adminMode)
        definitions.find(page => page.pageNumber === data.pageNumber).workbook = { ...data.workbook, review_status: "reviewed" }
        json({ ok: true }); return
      }
      if (req.method === "POST") {
        const data = await body()
        assert.equal(data.userId, userId)
        if (rejectSave) { res.statusCode = 503; json({ error: "Fixture: temporary save failure" }); return }
        await new Promise(resolve => setTimeout(resolve, saveDelay))
        for (const answer of data.answers) saved.set(`${answer.pageNumber}:${answer.fieldId}`, { ...answer, updatedAt: new Date().toISOString() })
        json({ ok: true }); return
      }
      const unit = units.find(item => item.id === url.searchParams.get("unitId"))
      json({ userId, canEdit: adminMode, pages: unit ? definitions.filter(page => page.pageNumber >= unit.start_page && page.pageNumber <= unit.end_page) : [], answers: [...saved.values()], progress: units.map(item => ({ unitId: item.id, answered: 0, total: 50 })) }); return
    }
    if (url.pathname.endsWith("/summary")) { json({ grammar: [], audio: [{ id: "audio1", title: "Bài 1 · File nghe đầy đủ", resource_url: "/api/audio/test" }], listening: null }); return }
    if (url.pathname === "/api/audio/test") {
      if (url.searchParams.has("segments")) { json({ canReview: true, status: "draft", segments: [{ id: "s0001", index: 1, start: 0, end: 3, clipStart: 0, clipEnd: 3.2, text_ko: "테스트 문장입니다.", text_vi: "Đây là câu dùng để kiểm thử giao diện.", section: "listening", role: "dialogue", questionNumber: 1, uncertain: false, audio_url: "/api/audio/test?clip=s0001" }], answerGuide: [] }); return }
      if (req.method === "POST") { const value = (await body()).seconds; if (url.searchParams.has("clip")) clipSeconds.set(url.searchParams.get("clip"), value); else audioSeconds = value; json({ ok: true }); return }
      if (url.searchParams.has("progress")) { json({ seconds: url.searchParams.has("clip") ? clipSeconds.get(url.searchParams.get("clip")) || 0 : audioSeconds }); return }
      const file = "D:/DATA-E9/MP3-SBT-Q1/FULL/B1.mp3"
      const size = (await stat(file)).size
      res.setHeader("Content-Type", "audio/mpeg"); res.setHeader("Accept-Ranges", "bytes")
      const range = /bytes=(\d+)-(\d*)/.exec(req.headers.range || "")
      if (range) { const start = Number(range[1]); const end = range[2] ? Number(range[2]) : size - 1; res.statusCode = 206; res.setHeader("Content-Range", `bytes ${start}-${end}/${size}`); res.setHeader("Content-Length", end - start + 1); createReadStream(file, { start, end }).pipe(res) }
      else { res.setHeader("Content-Length", size); createReadStream(file).pipe(res) }
      return
    }
    if (url.pathname.includes("/units/")) {
      const unit = units.find(item => url.pathname.endsWith(`/units/${item.id}`))
      json({ pages: unit ? definitions.filter(page => page.pageNumber >= unit.start_page && page.pageNumber <= unit.end_page).map(page => ({ page_number: page.pageNumber, imageUrl: `/pages/${page.pageNumber}.webp`, width: 1440, height: 1864, ocr_payload: {} })) : [] }); return
    }
    if (url.pathname.startsWith("/api/")) { json({ ok: true, regions: [] }); return }
    if (url.pathname.startsWith("/pages/")) { res.setHeader("Content-Type", "image/webp"); res.end(await readFile(`tmp/workbooks-2025/eps-topik-2025-workbook-1/${String(Number(path.basename(url.pathname, ".webp"))).padStart(4, "0")}.webp`)); return }
    res.setHeader("Content-Type", "text/html; charset=utf-8")
    res.end('<!doctype html><html lang="vi"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fixture.css"></head><body><div id="root"></div><script src="/fixture.js"></script></body></html>')
  } catch (error) { res.statusCode = 500; res.end(error.stack) }
})
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve))
const base = `http://127.0.0.1:${server.address().port}`
let browser
try {
  browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true, args: ["--no-sandbox", "--mute-audio"] })
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const errors = []
  page.on("pageerror", error => errors.push(error.message))
  await page.goto(`${base}/textbooks/fixture-book/read?page=15`)
  const match = definitions.find(item => item.pageNumber === 15).workbook.fields[0]
  const source = page.getByRole("button", { name: `${match.label}: chọn ${match.sources[0].label} để nối`, exact: true })
  await source.click()
  await page.getByRole("button", { name: `${match.label}: nối tới ${match.targets[0].label}`, exact: true }).click()
  await page.waitForFunction(() => document.body.innerText.includes("Đã lưu"))
  assert.ok(saved.get(`15:${match.id}`)?.value[match.sources[0].id])
  // Mobile summary opens, tabs switch, audio stays mounted after closing it.
  await page.getByRole("button", { name: "Nội dung liên kết", exact: true }).click()
  const dialog = page.getByRole("dialog", { name: "Tổng kết nhanh", exact: true })
  await dialog.waitFor({ state: "visible" })
  await dialog.getByRole("button", { name: "File nghe", exact: true }).click()
  await dialog.getByRole("button", { name: "Nghe trên trang sách", exact: true }).click()
  await dialog.waitFor({ state: "hidden" })
  assert.equal(await page.locator("[data-workbook-audio] audio").count(), 1)
  await page.locator("[data-workbook-audio] audio").evaluate(async audio => { if (!audio.readyState) await new Promise(resolve => audio.addEventListener('loadedmetadata', resolve, { once: true })); audio.currentTime = 42; audio.dispatchEvent(new Event('pause')) })
  await page.waitForTimeout(300)
  assert.ok(audioSeconds >= 41)
  await page.getByRole('button', { name: 'Từng câu (1)', exact: true }).click()
  await page.getByRole('button', { name: /테스트 문장입니다/ }).click()
  await page.waitForFunction(() => document.querySelector('[data-workbook-audio] audio').getAttribute('src').includes('clip=s0001'))
  await page.getByRole('checkbox', { name: 'Lặp câu', exact: true }).check()
  assert.equal(await page.locator('[data-workbook-audio] audio').evaluate(audio => audio.loop), true)
  await page.getByRole('button', { name: 'Xem tiếng Việt', exact: true }).click()
  assert.ok(await page.getByText('Đây là câu dùng để kiểm thử giao diện.').count())
  await page.locator('[data-workbook-audio] audio').evaluate(audio => { audio.currentTime = 2; audio.pause(); audio.dispatchEvent(new Event('pause')) })
  await page.waitForTimeout(300)
  assert.ok(clipSeconds.get('s0001') >= 1.9)
  assert.ok(audioSeconds >= 41 && audioSeconds < 43, 'Clip progress overwrote the full recording position')
  await page.getByRole('button', { name: 'Toàn bài', exact: true }).click()
  await page.getByRole('button', { name: 'Từng câu (1)', exact: true }).click()
  // Mobile answer editor supports Korean input and saves the value.
  const text = definitions.find(item => item.pageNumber === 16).workbook.fields[0]
  await page.locator('[data-page="16"]').scrollIntoViewIfNeeded()
  await page.getByRole("button", { name: new RegExp(text.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) }).first().click()
  await page.getByRole("textbox", { name: "Nhập câu trả lời", exact: true }).fill("택시 기사")
  await page.getByRole("button", { name: "Xong", exact: true }).click()
  await page.waitForTimeout(1000)
  assert.equal(saved.get(`16:${text.id}`)?.value, "택시 기사")
  await page.reload()
  await page.getByRole("button", { name: new RegExp("택시 기사") }).waitFor()
  await page.waitForFunction(() => Math.abs(document.querySelector('[data-workbook-audio] audio').currentTime - 42) < 1)
  // Failed saves keep a per-account backup and recover on reload.
  rejectSave = true
  await page.getByRole("button", { name: new RegExp("택시 기사") }).click()
  await page.getByRole("textbox", { name: "Nhập câu trả lời", exact: true }).fill("저는 택시 기사입니다.")
  await page.getByRole("button", { name: "Xong", exact: true }).click()
  await page.waitForTimeout(1000)
  assert.ok(await page.evaluate(() => Object.keys(localStorage).some(key => key.startsWith("workbook-pending:"))))
  rejectSave = false
  await page.reload()
  await page.waitForTimeout(1500)
  assert.equal(saved.get(`16:${text.id}`)?.value, "저는 택시 기사입니다.")
  await page.screenshot({ path: "reports/workbook-interactive-mobile.png" })
  // Desktop keeps the side panel and supports typing straight on the page.
  await page.setViewportSize({ width: 1440, height: 1000 })
  const textarea = page.getByRole("textbox", { name: new RegExp(text.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) }).first()
  await textarea.fill("택시 운전기사")
  await page.waitForTimeout(1000)
  assert.equal(saved.get(`16:${text.id}`)?.value, "택시 운전기사")
  saveDelay = 1200
  await textarea.fill("첫 번째 수정")
  await page.waitForTimeout(750)
  await textarea.fill("마지막 수정")
  await page.getByRole('link', { name: /Bài 2 ·/ }).click()
  await page.waitForTimeout(1400)
  await page.getByRole('link', { name: /Bài 1 ·/ }).click()
  await page.waitForTimeout(1800)
  assert.equal(saved.get(`16:${text.id}`)?.value, "마지막 수정")
  assert.equal(await textarea.inputValue(), "마지막 수정")
  saveDelay = 80
  const choice = definitions.find(item => item.pageNumber === 19).workbook.fields.find(field => field.kind === "choice")
  const option = page.getByRole("button", { name: new RegExp(choice.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) }).first()
  await option.scrollIntoViewIfNeeded()
  const optionBounds = await option.boundingBox()
  const markerBounds = await option.locator('[data-choice-marker]').boundingBox()
  assert.ok(optionBounds.width > markerBounds.width * 2, 'Option text must be clickable beyond its number')
  await option.click({ position: { x: optionBounds.width - 4, y: optionBounds.height / 2 } })
  await page.waitForTimeout(1000)
  assert.equal(saved.get(`19:${choice.id}`)?.value, choice.options[0].id)
  assert.equal(await option.getAttribute('aria-pressed'), 'true')
  assert.notEqual(await option.evaluate(node => getComputedStyle(node).backgroundColor), 'rgba(0, 0, 0, 0)')
  assert.ok((await option.locator('[data-choice-marker]').getAttribute('class')).includes('border-blue-700'))
  assert.equal(errors.length, 0, errors.join("\n"))
  await page.screenshot({ path: "reports/workbook-interactive-desktop.png" })
  for (const number of [212, 213, 215, 216]) {
    await page.goto(`${base}/textbooks/fixture-book/read?page=${number}`)
    await page.locator(`[data-page="${number}"] [aria-label="Bài tập tương tác trang ${number}"]`).waitFor()
    await page.locator(`[data-page="${number}"]`).scrollIntoViewIfNeeded()
    if (number === 215 || number === 216) {
      const sizes = await page.locator(`[data-page="${number}"] [data-choice-marker]`).evaluateAll(markers => markers.map(marker => marker.getBoundingClientRect().width))
      assert.ok(sizes.length >= 16)
      assert.ok(sizes.every(width => width <= 25), `Choice markers grew over text on page ${number}`)
    }
    await page.screenshot({ path: `reports/workbook-aligned-desktop-${number}.png` })
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${base}/textbooks/fixture-book/read?page=215`)
  await page.locator('[data-page="215"] button[aria-pressed]').first().waitFor()
  const mobileOption = page.locator('[data-page="215"] [data-choice-option]').first()
  await mobileOption.scrollIntoViewIfNeeded()
  const mobileBounds = await mobileOption.boundingBox()
  await mobileOption.tap({ position: { x: mobileBounds.width - 3, y: mobileBounds.height / 2 } })
  assert.equal(await mobileOption.getAttribute('aria-pressed'), 'true')
  await page.screenshot({ path: 'reports/workbook-aligned-mobile-215.png' })
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto(`${base}/textbooks/fixture-book/read?page=39`)
  const tablePage = page.locator('[data-page="39"]')
  await tablePage.getByRole('textbox', { name: 'Ngữ pháp · 1. 마시다', exact: true }).waitFor()
  const table = definitions.find(p => p.pageNumber === 39).workbook.fields.filter(f => f.section === 'grammar' && /^1[. ]/.test(f.label))
  assert.equal(table.length, 12)
  await tablePage.getByRole('textbox', { name: 'Ngữ pháp · 1. 마시다', exact: true }).fill('마셔요')
  await page.waitForTimeout(1000)
  assert.equal(saved.get('39:p39-table-masida')?.value, '마셔요')
  await page.screenshot({ path: 'reports/workbook-page39-table.png' })
  await page.goto(`${base}/textbooks/fixture-book/read?page=37`)
  const matchingPage = page.locator('[data-page="37"]')
  await matchingPage.locator('[data-match-port]').first().waitFor()
  assert.equal(await matchingPage.locator('[data-match-port]').count(), 22)
  const stage = definitions.find(p => p.pageNumber === 37).workbook.fields.find(f => f.id === 'p37-match-verbs')
  for (const sourceNode of stage.sources.slice(0, 2)) {
    await matchingPage.getByRole('button', { name: `${stage.label}: chọn ${sourceNode.label} để nối`, exact: true }).click()
    await matchingPage.getByRole('button', { name: `${stage.label}: nối tới ${stage.targets[0].label}`, exact: true }).click()
  }
  await page.waitForTimeout(1000)
  assert.equal(Object.keys(saved.get('37:p37-match-verbs')?.value || {}).length, 2, 'Two nouns can share one verb without losing the first connection')
  await page.reload()
  await matchingPage.locator('[data-match-port]').first().waitFor()
  assert.equal(await matchingPage.locator('svg line').count(), 2)
  await page.screenshot({ path: 'reports/workbook-matching-37-desktop.png' })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${base}/textbooks/fixture-book/read?page=47`)
  await page.locator('[data-page="47"] [data-match-port]').first().waitFor()
  assert.equal(await page.locator('[data-page="47"] [data-match-port]').count(), 10)
  await page.screenshot({ path: 'reports/workbook-matching-47-mobile.png' })
  await page.setViewportSize({ width: 1440, height: 1000 })
  adminMode = true
  await page.goto(`${base}/textbooks/fixture-book/read?page=16`)
  const page16 = page.locator('[data-page="16"]')
  await page16.getByRole('button', { name: 'Chỉnh vùng làm bài', exact: true }).click()
  await page16.getByRole('button', { name: `Chỉnh ${text.label}`, exact: true }).click()
  await page16.getByRole('spinbutton', { name: 'Trái (%)', exact: true }).fill('40')
  await page16.getByRole('button', { name: 'Lưu vùng', exact: true }).click()
  await page16.getByRole('button', { name: 'Chỉnh vùng làm bài', exact: true }).waitFor()
  assert.equal(definitions.find(page => page.pageNumber === 16).workbook.fields[0].rect.x, 0.4)
  console.log("PASS: mobile matching/input/summary, audio position restore, reload and failed-save recovery, edits during in-flight saves and unit navigation, desktop reading choices and admin layout editing")
} finally { await browser?.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)) }
