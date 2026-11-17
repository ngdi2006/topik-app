"use client"

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react"

const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`

export default function AudioWaveform({ peaks, currentTime, duration, onSeek, label, className = "h-12" }: {
  peaks?: readonly number[]
  currentTime: number
  duration: number
  onSeek: (seconds: number) => void
  label: string
  className?: string
}) {
  const surface = useRef<HTMLDivElement>(null)
  const pointer = useRef<number | null>(null)
  const [width, setWidth] = useState(320)
  const clipId = `wave-${useId().replaceAll(":", "")}`
  const safeDuration = Number.isFinite(duration) ? Math.max(0, duration) : 0
  const time = Number.isFinite(currentTime) ? Math.max(0, Math.min(currentTime, safeDuration)) : 0
  const progress = safeDuration > 0 ? time / safeDuration : 0
  useEffect(() => {
    if (!surface.current) return
    const observer = new ResizeObserver(entries => {
      const next = Math.round(entries[0]?.contentRect.width || 0)
      if (next > 0) setWidth(next)
    })
    observer.observe(surface.current)
    return () => observer.disconnect()
  }, [])
  const path = useMemo(() => {
    if (!peaks?.length) return "M 0 50 H 1000"
    const count = Math.max(16, Math.min(600, Math.floor(width / 3)))
    const commands = []
    for (let index = 0; index < count; index++) {
      const from = Math.floor(index * peaks.length / count)
      const to = Math.max(from + 1, Math.floor((index + 1) * peaks.length / count))
      let peak = 0
      for (let sample = from; sample < Math.min(to, peaks.length); sample++) peak = Math.max(peak, peaks[sample])
      const height = Math.max(1, peak / 255 * 84)
      const x = (index + 0.5) * 1000 / count
      commands.push(`M${x.toFixed(2)} ${(50-height/2).toFixed(2)}v${height.toFixed(2)}`)
    }
    return commands.join("")
  }, [peaks, width])
  const seekAt = (event: PointerEvent<HTMLDivElement>) => {
    if (!safeDuration) return
    const box = event.currentTarget.getBoundingClientRect()
    onSeek(Math.max(0, Math.min(1, (event.clientX-box.left)/Math.max(1,box.width))) * safeDuration)
  }
  const keyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!safeDuration) return
    const step = event.shiftKey ? 5 : 1
    const next = { ArrowRight: time+step, ArrowUp: time+step, ArrowLeft: time-step, ArrowDown: time-step, PageUp: time+10, PageDown: time-10, Home: 0, End: safeDuration }[event.key]
    if (next === undefined) return
    event.preventDefault()
    onSeek(Math.max(0,Math.min(safeDuration,next)))
  }
  return <div
    aria-disabled={!safeDuration}
    aria-label={label}
    aria-valuemin={0}
    aria-valuemax={safeDuration || 1}
    aria-valuenow={time}
    aria-valuetext={`${formatTime(time)} / ${formatTime(safeDuration)}`}
    className={`relative min-h-11 w-full min-w-0 select-none rounded-lg [touch-action:pan-y] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${safeDuration ? "cursor-pointer" : "cursor-default"} ${className}`}
    data-waveform
    data-waveform-points={peaks?.length || 0}
    data-waveform-progress={progress}
    onKeyDown={keyDown}
    onPointerDown={event => { if (event.button !== 0 || !safeDuration) return; event.preventDefault(); event.currentTarget.focus({preventScroll:true}); pointer.current=event.pointerId; event.currentTarget.setPointerCapture(event.pointerId); seekAt(event) }}
    onPointerMove={event => { if (pointer.current===event.pointerId) seekAt(event) }}
    onPointerUp={event => { if(pointer.current!==event.pointerId)return; seekAt(event); pointer.current=null; if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId) }}
    onPointerCancel={() => {pointer.current=null}}
    ref={surface}
    role="slider"
    tabIndex={safeDuration ? 0 : -1}
    title="Chạm hoặc kéo sóng âm để tua · Phím mũi tên để chỉnh vị trí"
  >
    <svg aria-hidden="true" className="absolute inset-0 h-full w-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 1000 100">
      <defs><clipPath id={clipId}><rect height="100" width={progress*1000} /></clipPath></defs>
      <path d="M0 50H1000" fill="none" stroke="#e0e7ff" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      <path d={path} data-waveform-path fill="none" stroke="#a5b4fc" strokeLinecap="round" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      <path clipPath={`url(#${clipId})`} d={path} fill="none" stroke="#4f46e5" strokeLinecap="round" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      <line data-waveform-playhead stroke="#f43f5e" strokeWidth="1.5" vectorEffect="non-scaling-stroke" x1={progress*1000} x2={progress*1000} y1="4" y2="96" />
    </svg>
  </div>
}
