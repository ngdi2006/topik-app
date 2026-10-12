'use client'

import { useEffect, useEffectEvent, useRef } from 'react'

type PlayerProgress = { watchedSeconds: number; durationSeconds: number; percent: number }
type YouTubePlayer = { destroy: () => void; getDuration: () => number; getCurrentTime: () => number; pauseVideo: () => void; playVideo: () => void }
type YouTubeNamespace = { Player: new (element: HTMLDivElement, options: Record<string, unknown>) => YouTubePlayer }

declare global {
  interface Window { YT?: YouTubeNamespace; onYouTubeIframeAPIReady?: () => void }
}

let youtubeApiPromise: Promise<YouTubeNamespace> | null = null

function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (youtubeApiPromise) return youtubeApiPromise
  youtubeApiPromise = new Promise(resolve => {
    const previousCallback = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previousCallback?.()
      if (window.YT) resolve(window.YT)
    }
    if (!document.getElementById('youtube-iframe-api')) {
      const script = document.createElement('script')
      script.id = 'youtube-iframe-api'
      script.src = 'https://www.youtube.com/iframe_api'
      script.async = true
      document.head.appendChild(script)
    }
  })
  return youtubeApiPromise
}

type InteractionCue = { id: string; timestamp_seconds: number }

export function YouTubeLearningPlayer({ videoId, stepId, title, initialWatchedSeconds, interactions, completedInteractionIds, interactionOpen, onInteraction, onProgress }: { videoId: string; stepId: string; title: string; initialWatchedSeconds: number; interactions: InteractionCue[]; completedInteractionIds: string[]; interactionOpen: boolean; onInteraction: (id: string) => void; onProgress: (progress: PlayerProgress) => void }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<YouTubePlayer | null>(null)
  const wasInteractionOpenRef = useRef(false)
  const reportProgress = useEffectEvent(onProgress)
  const triggerInteraction = useEffectEvent(onInteraction)
  const isInteractionCompleted = useEffectEvent((id: string) => completedInteractionIds.includes(id))

  useEffect(() => {
    if (interactionOpen) playerRef.current?.pauseVideo()
    else if (wasInteractionOpenRef.current) playerRef.current?.playVideo()
    wasInteractionOpenRef.current = interactionOpen
  }, [interactionOpen])

  useEffect(() => {
    let active = true
    let player: YouTubePlayer | null = null
    let timer: ReturnType<typeof setInterval> | null = null
    let watchedSeconds = Math.max(0, initialWatchedSeconds)
    let durationSeconds = 0
    let lastSavedSeconds = watchedSeconds
    const triggered = new Set<string>()

    const report = (persist = false) => {
      if (!durationSeconds) return
      const percent = Math.min(100, Math.round((watchedSeconds / durationSeconds) * 100))
      reportProgress({ watchedSeconds: Math.round(watchedSeconds), durationSeconds: Math.round(durationSeconds), percent })
      if (persist && Math.floor(watchedSeconds) > Math.floor(lastSavedSeconds)) {
        lastSavedSeconds = watchedSeconds
        void fetch('/api/elearning/progress', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stepId, status: 'in_progress', progressPercent: percent, watchedSeconds: Math.round(watchedSeconds), videoDurationSeconds: Math.round(durationSeconds) }), keepalive: true })
      }
    }
    const stopTracking = () => { if (timer) clearInterval(timer); timer = null; report(true) }
    const startTracking = () => {
      if (timer) return
      timer = setInterval(() => {
        watchedSeconds = Math.min(durationSeconds || Number.POSITIVE_INFINITY, watchedSeconds + 1)
        report(watchedSeconds - lastSavedSeconds >= 10)
        const currentTime = player?.getCurrentTime() || 0
        const cue = interactions.find(item => item.timestamp_seconds <= currentTime && !triggered.has(item.id) && !isInteractionCompleted(item.id))
        if (cue) { triggered.add(cue.id); player?.pauseVideo(); triggerInteraction(cue.id) }
      }, 1000)
    }

    void loadYouTubeApi().then(YT => {
      if (!active || !containerRef.current) return
      player = new YT.Player(containerRef.current, {
        width: '100%',
        height: '100%',
        videoId,
        host: 'https://www.youtube-nocookie.com',
        playerVars: {
          controls: 1,
          playsinline: 1,
          rel: 0,
          iv_load_policy: 3,
          cc_load_policy: 0,
          fs: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: () => { durationSeconds = Math.max(1, player?.getDuration() || 0); report() },
          onStateChange: (event: { data: number }) => { if (event.data === 1) startTracking(); else stopTracking() },
        },
      })
      playerRef.current = player
    })

    return () => { active = false; stopTracking(); playerRef.current = null; player?.destroy() }
  }, [initialWatchedSeconds, interactions, stepId, videoId])

  return <div className="aspect-video w-full max-w-full overflow-hidden bg-black sm:rounded-2xl" aria-label={title}><div className="h-full w-full [&>iframe]:h-full [&>iframe]:w-full" ref={containerRef} /></div>
}
