import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import http from 'node:http'
import path from 'node:path'
import { build } from '../tmp/workbook-validation/node_modules/esbuild/lib/main.js'
import { chromium } from '../tmp/workbook-validation/node_modules/playwright/index.mjs'
import { compile } from '@tailwindcss/node'
import { Scanner } from '@tailwindcss/oxide'
const root='tmp/workbook-validation'
await writeFile(`${root}/menu-entry.jsx`,`import React from'react';import{createRoot}from'react-dom/client';import{TextbookNavigationLink,CampusNavigationLink}from'../../src/components/shared/TextbookNavigationLink';import{useUserStore}from'../../src/store/userStore';useUserStore.getState().setRole(window.fixture.role);createRoot(document.getElementById('root')).render(<><nav data-desktop className="w-64 space-y-2 rounded-xl bg-blue-700 p-3"><TextbookNavigationLink/><CampusNavigationLink/></nav><nav data-mobile className="mt-4 w-64 space-y-2 rounded-xl bg-white p-3"><TextbookNavigationLink mobile/><CampusNavigationLink mobile/></nav></>);`)
const result=await build({entryPoints:[`${root}/menu-entry.jsx`],bundle:true,write:false,format:'iife',jsx:'automatic',define:{'process.env.NODE_ENV':'"development"'},plugins:[{name:'fixture',setup(builder){builder.onResolve({filter:/^next\/(link|navigation)$/},args=>({path:args.path,namespace:'fixture'}));builder.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:args.path.endsWith('link')?`import React from'react';export default function Link(props){return <a {...props}/>}`:`export const usePathname=()=>window.fixture.pathname`,loader:'jsx',resolveDir:process.cwd()}))}}]})
const compiler=await compile(await readFile('src/app/globals.css','utf8'),{base:path.resolve('src/app'),onDependency(){}})
const css=compiler.build(new Scanner({sources:[{base:path.resolve('src'),pattern:'**/*.{tsx,ts}',negated:false}]}).scan())
const server=http.createServer((req,res)=>{if(req.url==='/bundle'){res.end(result.outputFiles[0].contents);return}if(req.url==='/css'){res.setHeader('content-type','text/css');res.end(css);return}const url=new URL(req.url,'http://fixture');res.setHeader('content-type','text/html; charset=utf-8');res.end(`<html><head><meta name=viewport content="width=device-width,initial-scale=1"><link rel=stylesheet href=/css></head><body style="padding:16px;background:#f1f5f9"><div id=root></div><script>window.fixture=${JSON.stringify({role:url.searchParams.get('role'),pathname:url.searchParams.get('path')||'/dashboard'})}</script><script src=/bundle></script></body></html>`)})
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`
let browser
try{
 browser=await chromium.launch({channel:'msedge',headless:true})
 const page=await browser.newPage({viewport:{width:390,height:844}})
 for(const role of ['student','teacher','supporter','admin'])for(const current of ['/dashboard','/textbooks','/textbooks/book/read']){
  await page.goto(`${base}/?role=${role}&path=${current}`)
  const links=page.getByRole('link',{name:'Giáo trình EPS',exact:true});await links.first().waitFor();assert.equal(await links.count(),2)
  assert.equal(await page.locator('a[href="/campus"]').count(),role==='admin'?2:0)
  for(const link of await links.all()){assert.equal(await link.getAttribute('href'),'/textbooks');assert.equal(await link.getAttribute('aria-current'),current==='/dashboard'?null:'page');assert.ok((await link.boundingBox()).height>=44)}
  if(current==='/textbooks'&&['student','admin'].includes(role))await page.screenshot({path:`reports/eps-menu-${role}.png`})
 }
 console.log('PASS desktop/mobile EPS menu: active library link for all roles; campus visible only to admin')
}finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve))}
