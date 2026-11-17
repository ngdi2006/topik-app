import { readFile, writeFile, mkdir } from "node:fs/promises"
import { createRequire } from "node:module"
import vm from "node:vm"
import ts from "typescript"
import dotenv from "dotenv"
import { createClient } from "@supabase/supabase-js"

dotenv.config({ path: ".env.local", quiet: true })
const apply=process.argv.includes("--apply")
const schema={}
vm.runInNewContext(ts.transpileModule(await readFile("src/lib/textbooks/listening.ts","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:schema,require:createRequire(import.meta.url)})
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
const check=result=>{if(result.error)throw result.error;return result.data}
const books=check(await db.from("textbooks").select("id,code").in("code",["eps-topik-2025-workbook-1","eps-topik-2025-workbook-2"]))
const results=[];let cursor=1
await mkdir("tmp/workbook-listening-elevenlabs/backups",{recursive:true})
await Promise.all(Array.from({length:3},async()=>{
  while(cursor<=60){
    const lesson=cursor++
    try{
      const wave=JSON.parse(await readFile(`tmp/workbook-listening-elevenlabs/B${lesson}/question-groups/waveforms.json`,"utf8"))
      const book=books.find(book=>book.code===`eps-topik-2025-workbook-${lesson<=30?1:2}`)
      const unit=check(await db.from("textbook_units").select("id").eq("textbook_id",book.id).eq("unit_number",lesson).single())
      const resources=check(await db.from("textbook_resources").select("id,metadata").eq("unit_id",unit.id).eq("kind","audio"))
      const resource=resources.find(resource=>resource.metadata?.source_file===`B${lesson}.mp3`)
      const old=resource?.metadata?.listening
      if(!old||old.sourceChecksum!==wave.sourceChecksum||old.segments.length!==Object.keys(wave.groups).length)throw new Error("Source or group mismatch")
      const listening={...old,waveform:wave.full.peaks,segments:old.segments.map(segment=>{
        const clip=wave.groups[segment.id]
        if(!clip||!segment.audio_path.includes(`/${clip.audioChecksum.slice(0,16)}/`))throw new Error("Clip waveform checksum does not match installed audio")
        return {...segment,waveform:clip.peaks}
      })}
      if(!schema.parseListening({listening}))throw new Error("Invalid waveform manifest")
      if(apply){
        await writeFile(`tmp/workbook-listening-elevenlabs/backups/B${lesson}-waveform-${Date.now()}.json`,JSON.stringify({resourceId:resource.id,metadata:resource.metadata},null,2),{flag:"wx"})
        const current=check(await db.from("textbook_resources").select("metadata").eq("id",resource.id).single())
        if(JSON.stringify(current.metadata)!==JSON.stringify(resource.metadata))throw new Error("Concurrent edit; cancelled")
        const changed=check(await db.from("textbook_resources").update({metadata:{...current.metadata,listening}}).eq("id",resource.id).eq("metadata->listening->>sourceChecksum",wave.sourceChecksum).eq("metadata->listening->>segmentation",old.segmentation).select("id"))
        if(changed.length!==1)throw new Error("Concurrent edit; cancelled")
        const saved=check(await db.from("textbook_resources").select("metadata").eq("id",resource.id).single()).metadata.listening
        if(JSON.stringify(saved.waveform)!==JSON.stringify(listening.waveform)||saved.segments.some((segment,index)=>JSON.stringify(segment.waveform)!==JSON.stringify(listening.segments[index].waveform)||segment.audio_path!==old.segments[index].audio_path))throw new Error("Remote waveform verification failed")
      }
      results.push({lesson,status:apply?"installed_verified":"planned",groups:listening.segments.length})
      console.log(`B${lesson}: ${apply?"installed and verified":"planned"} full waveform + ${listening.segments.length} group waveforms`)
    }catch(error){results.push({lesson,status:"failed",error:error.message||String(error)});console.error(`B${lesson}: FAILED ${error.message||String(error)}`)}
  }
}))
await writeFile("reports/workbook-waveform-installation.json",JSON.stringify({applied:apply,results:results.sort((a,b)=>a.lesson-b.lesson)},null,2))
if(results.some(result=>result.status==="failed"))process.exitCode=1
