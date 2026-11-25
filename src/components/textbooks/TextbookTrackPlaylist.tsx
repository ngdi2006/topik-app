'use client'
import {createContext,useContext,useEffect,useLayoutEffect,useRef,useState,type ReactNode} from 'react'
import {ChevronLeft,ChevronRight,Music2,Play,Pause,RotateCcw,Volume2} from 'lucide-react'
import AudioWaveform from './AudioWaveform'
import printedAnchors from '@/lib/textbooks/course-audio-anchors.json'
type Track={id:string;title:string;resource_url:string|null;page_number?:number|null}
type Learning={id:string;status:string;canViewTranscript:boolean;duration?:number;waveform:number[];pageNumber?:number;segments:{id:string;start:number;end:number;text_ko:string;speakerIds:string[]}[]}
const format=(n:number)=>`${Math.floor(n/60)}:${String(Math.floor(n%60)).padStart(2,'0')}`
type Props={tracks:Track[];onNavigatePage?:(page:number)=>void}
function useTrackController({tracks,onNavigatePage}:Props){
    const [selected,setSelected]=useState(tracks[0]?.id),[error,setError]=useState(false),[learning,setLearning]=useState<Learning|null>(null),[dataError,setDataError]=useState(false),[retry,setRetry]=useState(0)
    const [time,setTime]=useState(0),[duration,setDuration]=useState(0),[playing,setPlaying]=useState(false),[rate,setRate]=useState(1)
    const playerRef=useRef<HTMLAudioElement>(null),pendingSeekRef=useRef<number|null>(null)
    const autoplayRef=useRef(false)
    const index=Math.max(0,tracks.findIndex(t=>t.id===selected)),current=tracks[index]
    const currentId=current?.id,url=current?.resource_url
    const hasCurrent=!!current
    useEffect(()=>{const audio=playerRef.current;return ()=>audio?.pause()},[hasCurrent])
    useLayoutEffect(()=>{
        if(!autoplayRef.current||!playerRef.current)return
        autoplayRef.current=false
        void playerRef.current.play().catch(()=>setError(true))
    },[currentId,url])
    useEffect(()=>{
        if(!currentId||!url)return
        const controller=new AbortController()
        fetch(`${url}${url.includes('?')?'&':'?'}track-data=1`,{signal:controller.signal,cache:'no-store'}).then(async response=>{if(!response.ok)throw new Error('No track data');return response.json()}).then(data=>{if(!controller.signal.aborted){setLearning({...data,id:currentId});setDataError(false)}}).catch(()=>{if(!controller.signal.aborted)setDataError(true)})
        return ()=>controller.abort()
    },[currentId,url,retry])
    const data=learning?.id===currentId?learning:null
    const seek=(seconds:number,play=false)=>{
        const audio=playerRef.current;if(!audio)return
        const bound=Number.isFinite(audio.duration)&&audio.duration>0?audio.duration:data?.duration||0
        const target=Math.max(0,Math.min(seconds,bound));setTime(target)
        if(audio.readyState>=1)audio.currentTime=target;else pendingSeekRef.current=target
        if(play)void audio.play().catch(()=>setError(true))
    }
    const selectTrack=(id:string)=>{
        autoplayRef.current=false
        playerRef.current?.pause();pendingSeekRef.current=null;setError(false);setPlaying(false);setDataError(false)
        if(id!==currentId){setTime(0);setDuration(0);setLearning(null);setSelected(id)}
    }
    const choose=(id:string)=>{
        selectTrack(id)
        const page=tracks.find(t=>t.id===id)?.page_number||(id===currentId?data?.pageNumber:null)
        if(page)onNavigatePage?.(page)
    }
    const playTrack=(id:string)=>{
        if(!tracks.some(t=>t.id===id&&t.resource_url))return
        if(id===currentId){if(playing)playerRef.current?.pause();else void playerRef.current?.play().catch(()=>setError(true));return}
        selectTrack(id);autoplayRef.current=true
    }
    return {tracks,onNavigatePage,current,currentId,index,playerRef,pendingSeekRef,data,time,duration,playing,rate,error,dataError,seek,choose,playTrack,setTime,setDuration,setPlaying,setRate,setError,setDataError,setRetry}
}
const TrackContext=createContext<ReturnType<typeof useTrackController>|null>(null)
export function TextbookTrackProvider({children,...props}:Props&{children:ReactNode}){
    const value=useTrackController(props)
    const {current,playerRef,pendingSeekRef,rate,setDuration,setError,setTime,setPlaying}=value
    return <TrackContext.Provider value={value}>{current&&<audio ref={playerRef} preload="metadata" src={current.resource_url||undefined} aria-label={current.title} className="hidden" onError={()=>setError(true)} onCanPlay={()=>setError(false)} onTimeUpdate={e=>setTime(e.currentTarget.currentTime)} onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onEnded={()=>setPlaying(false)} onDurationChange={e=>{if(Number.isFinite(e.currentTarget.duration))setDuration(e.currentTarget.duration)}} onLoadedMetadata={e=>{const audio=e.currentTarget;setDuration(audio.duration);audio.playbackRate=rate;if(pendingSeekRef.current!==null){audio.currentTime=Math.min(pendingSeekRef.current,audio.duration);pendingSeekRef.current=null}}}/>}{children}</TrackContext.Provider>
}
export default function TextbookTrackPlaylist(props:Props){
    const shared=useContext(TrackContext)
    return shared?<TrackControls/>:<TextbookTrackProvider {...props}><TrackControls/></TextbookTrackProvider>
}
function TrackControls(){
    const shared=useContext(TrackContext)
    if(!shared)return null
    const {tracks,onNavigatePage,current,index,playerRef,data,time,duration,playing,rate,error,dataError,seek,choose,setRate,setError,setDataError,setRetry}=shared
    if(!current)return null
    return <section className="flex min-h-0 flex-1 flex-col p-3" aria-label="Danh sách track giáo trình">

        <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3"><p className="flex items-center gap-2 text-xs font-bold text-blue-700"><Music2 size={15}/>{current.title}</p>
            <AudioWaveform peaks={data?.waveform} currentTime={time} duration={duration||data?.duration||0} onSeek={seek} label="Tua theo sóng âm" className="mt-3 h-14"/>
            <div className="mt-2 flex items-center gap-2"><button type="button" aria-label={playing?'Tạm dừng file nghe':'Phát file nghe'} onClick={()=>{if(playing)playerRef.current?.pause();else void playerRef.current?.play().catch(()=>setError(true))}} className="grid size-10 shrink-0 place-items-center rounded-full bg-blue-600 text-white focus-visible:outline-2 focus-visible:outline-blue-700">{playing?<Pause size={16}/>:<Play size={16}/>}</button><button type="button" aria-label="Nghe lại" onClick={()=>seek(0,true)} className="grid size-9 shrink-0 place-items-center rounded-lg text-blue-700"><RotateCcw size={15}/></button><span className="min-w-0 flex-1 text-[10px] tabular-nums text-slate-500">{format(time)} / {format(duration||data?.duration||0)}</span><select aria-label="Tốc độ nghe" value={rate} onChange={e=>{const value=Number(e.target.value);setRate(value);if(playerRef.current)playerRef.current.playbackRate=value}} className="min-h-9 rounded-lg border border-blue-100 bg-white px-1 text-[11px]">{[.75,1,1.25,1.5].map(n=><option key={n} value={n}>{n}×</option>)}</select></div>
            {error&&<p role="alert" className="mt-2 text-xs text-red-600">Chưa phát được file nghe. <button className="underline" onClick={()=>{setError(false);playerRef.current?.load()}}>Thử lại</button></p>}
            {dataError&&<p role="status" className="mt-2 text-[10px] text-slate-500">Chưa tải được lời thoại/sóng âm. <button onClick={()=>{setDataError(false);setRetry(n=>n+1)}} className="underline">Thử lại</button></p>}
            <div className="mt-2 flex items-center justify-between gap-2"><button type="button" disabled={index===0} onClick={()=>choose(tracks[index-1].id)} className="flex min-h-10 items-center gap-1 rounded-lg px-2 text-xs text-blue-700 disabled:opacity-40"><ChevronLeft size={15}/>Trước</button><span className="text-[10px] tabular-nums text-slate-500">{index+1}/{tracks.length}</span><button type="button" disabled={index===tracks.length-1} onClick={()=>choose(tracks[index+1].id)} className="flex min-h-10 items-center gap-1 rounded-lg px-2 text-xs text-blue-700 disabled:opacity-40">Tiếp<ChevronRight size={15}/></button></div>
        </div>
        <div className="mt-3 min-h-0 flex-1 space-y-4 overflow-y-auto"><ol className="space-y-1">{tracks.map(track=><li key={track.id}><button type="button" aria-label={track.title} aria-pressed={current.id===track.id} disabled={!track.resource_url} onClick={()=>choose(track.id)} className={`flex min-h-11 w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs leading-5 transition focus-visible:outline-2 focus-visible:outline-blue-600 ${current.id===track.id?'border-blue-200 bg-blue-50 font-semibold text-blue-700':'border-transparent text-slate-600 hover:bg-slate-50'}`}><Music2 size={14} className="shrink-0"/><span className="min-w-0 flex-1">{track.title}</span>{track.page_number&&<span className="shrink-0 text-[10px] text-slate-400">Tr. {track.page_number}</span>}</button></li>)}</ol>
        {data?.canViewTranscript&&data.segments?.length>0&&<details key={current.id} className="rounded-xl border border-slate-200 bg-white"><summary className="cursor-pointer px-3 py-3 text-xs font-bold text-slate-700">Hiện lời thoại </summary><div className="space-y-1 border-t border-slate-100 p-2">{data.segments.map(segment=>{
            const active=time>=segment.start&&time<segment.end
            return <button type="button" key={segment.id} data-transcript-segment={segment.id} aria-current={active?'true':undefined} onClick={()=>{seek(segment.start,true);if(data.pageNumber)onNavigatePage?.(data.pageNumber)}} className={`flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left focus-visible:outline-2 focus-visible:outline-blue-600 ${active?'bg-indigo-50 text-indigo-800':'text-slate-700 hover:bg-slate-50'}`}><span className="mt-1 shrink-0 text-[9px] tabular-nums text-slate-400">{format(segment.start)}</span><span lang="ko" className="min-w-0 text-sm leading-7 [overflow-wrap:anywhere]">{segment.text_ko}</span></button>
        })}</div></details>}</div>
    </section>
}
export function TextbookTrackMiniPlayer({children}:{children?:ReactNode}){
    const shared=useContext(TrackContext)
    if(!shared?.current||!shared.playing&&shared.time===0)return <div className="mx-auto flex w-full max-w-3xl justify-end px-2 py-0.5">{children}</div>
    const {playerRef,current,data,time,duration,playing,seek,setError}=shared
    return <div className="mx-auto flex w-full max-w-3xl items-center gap-1.5 border-t border-blue-100 px-2 py-0.5" data-textbook-track-dock>
        <button type="button" aria-label={playing?'Tạm dừng track':'Tiếp tục track'} onClick={()=>{if(playing)playerRef.current?.pause();else void playerRef.current?.play().catch(()=>setError(true))}} className="grid size-7 shrink-0 place-items-center rounded-full bg-blue-600 text-white">{playing?<Pause size={12}/>:<Play size={12}/>}</button>
        <span className="max-w-14 truncate text-[9px] font-semibold text-blue-700 sm:max-w-24" title={current.title}>{current.title}</span>
        <div className="min-w-0 flex-1"><AudioWaveform peaks={data?.waveform} currentTime={time} duration={duration||data?.duration||0} onSeek={seek} label="Tua nhanh track đang nghe" className="!min-h-7 h-7"/></div>
        <span className="shrink-0 text-[9px] tabular-nums text-slate-500">{format(time)}</span>
        {children&&<div className="shrink-0 border-l border-blue-100 pl-1">{children}</div>}
    </div>
}
export function TextbookPageTrackAudio({pageNumber}:{pageNumber:number}){
    const shared=useContext(TrackContext)
    if(!shared)return null
    const anchors=printedAnchors as Record<string,{page:number;x:number;y:number;slot:number}>
    const tracks=shared.tracks.filter(t=>t.page_number===pageNumber&&anchors[t.id]?.page===pageNumber)
    if(!tracks.length)return null
    return <div role="group" aria-label={`File nghe trang ${pageNumber}`} className="pointer-events-none absolute inset-0 z-20">
        {tracks.map(track=>{
            const anchor=anchors[track.id],active=shared.currentId===track.id,playing=active&&shared.playing
            const variants=tracks.filter(t=>Math.abs(anchors[t.id].x-anchor.x)<.001&&Math.abs(anchors[t.id].y-anchor.y)<.001).length>1
            return <button key={track.id} type="button" aria-label={`${playing?'Tạm dừng':'Nghe'} ${track.title}`} aria-pressed={active} title={track.title} data-textbook-track-hotspot={track.id} data-anchor-x={0.105} data-anchor-y={anchor.y} disabled={!track.resource_url} onClick={()=>shared.playTrack(track.id)} className={`pointer-events-auto absolute grid -translate-x-1/2 -translate-y-1/2 touch-manipulation place-items-center rounded-full border shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${active?'border-blue-600 bg-blue-600 text-white':'border-violet-300 bg-white/95 text-violet-700 hover:bg-violet-50'}`} style={{left:`calc(${0.105*100}% + ${anchor.slot} * (clamp(24px, 3.5cqw, 36px) + 4px))`,top:`${anchor.y*100}%`,width:'clamp(24px, 3.5cqw, 36px)',height:'clamp(24px, 3.5cqw, 36px)'}}>{playing?<Pause aria-hidden="true" className="h-[55%] w-[55%]"/>:<Volume2 aria-hidden="true" className="h-[60%] w-[60%]"/>}{variants&&<span aria-hidden="true" className="absolute -bottom-1 -right-1 grid size-3 rounded-full bg-slate-700 text-[8px] text-white">{anchor.slot+1}</span>}</button>
        })}
    </div>
}
