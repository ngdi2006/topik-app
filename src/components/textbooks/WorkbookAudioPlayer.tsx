"use client"

import { useCallback, useEffect, useRef, useState } from "react"

type AudioResource = { id: string; title: string; resource_url: string | null }
export default function WorkbookAudioPlayer({ resource, userId, autoPlay = false, loop = false }: { resource: AudioResource; userId: string | null; autoPlay?: boolean; loop?: boolean }) {
  const audio = useRef<HTMLAudioElement>(null)
  const resumeAt = useRef<number | null>(null)
  const lastSaved = useRef(0)
  const [saveError, setSaveError] = useState(false)
  const [speed, setSpeed] = useState(1)
  const save = useCallback((element?: HTMLAudioElement | null) => {
    const player = element || audio.current
    if (!userId || !resource.resource_url || !player || !Number.isFinite(player.duration) || player.duration <= 0) return
    lastSaved.current = Date.now()
    void fetch(resource.resource_url, { method: "POST", headers: { "content-type": "application/json" }, keepalive: true, body: JSON.stringify({ userId, seconds: player.currentTime, duration: player.duration }) })
      .then(response => setSaveError(!response.ok)).catch(() => setSaveError(true))
  }, [resource.resource_url, userId])
  const restore = () => {
    if (audio.current && resumeAt.current !== null && Number.isFinite(audio.current.duration)) {
      audio.current.currentTime = Math.min(resumeAt.current, Math.max(0, audio.current.duration - 0.1))
      resumeAt.current = null
    }
  }
  useEffect(() => {
    if (!resource.resource_url) return
    const controller = new AbortController()
    void fetch(`${resource.resource_url}${resource.resource_url.includes("?") ? "&" : "?"}progress=1`, { cache: "no-store", signal: controller.signal }).then(response => response.ok ? response.json() : null).then(data => {
      if (!controller.signal.aborted && data && audio.current?.paused) { resumeAt.current = data.seconds; restore() }
    }).catch(() => undefined)
    const player = audio.current
    const flush = () => save(player)
    window.addEventListener("pagehide", flush)
    return () => { controller.abort(); window.removeEventListener("pagehide", flush); flush() }
  }, [resource.resource_url, save])
  return <div className="shrink-0 border-b bg-white px-3 py-2 sm:px-5" data-workbook-audio>
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1"><p className="text-[11px] font-bold text-slate-700">{resource.title}</p><label className="ml-auto flex items-center gap-1 text-[11px] text-slate-500">Tốc độ<select aria-label="Tốc độ nghe" className="rounded border bg-white px-1 py-0.5" onChange={event => { const rate = Number(event.target.value); setSpeed(rate); if (audio.current) audio.current.playbackRate = rate }} value={speed}>{[0.75, 1, 1.25, 1.5].map(rate => <option key={rate} value={rate}>{rate}×</option>)}</select></label></div>
    <audio aria-label={resource.title} autoPlay={autoPlay} className="mt-1 h-9 w-full" controls loop={loop} onEnded={() => save()} onLoadedMetadata={restore} onPause={() => save()} onTimeUpdate={() => { if (Date.now() - lastSaved.current > 10000) save() }} preload="metadata" ref={audio} src={resource.resource_url || undefined} />
    {saveError ? <p className="mt-1 text-[10px] text-amber-700">Chưa lưu được vị trí nghe; câu trả lời vẫn lưu riêng.</p> : null}
  </div>
}
