"use client"

import { useState, useRef, useEffect } from "react"
import { Play, Pause, Volume2, VolumeX, Rewind, FastForward } from "lucide-react"

interface AudioPlayerProps {
    src: string
    title?: string
}

export function AudioPlayer({ src, title = "Listening Audio" }: AudioPlayerProps) {
    const [isPlaying, setIsPlaying] = useState(false)
    const [duration, setDuration] = useState(0)
    const [currentTime, setCurrentTime] = useState(0)
    const [isMuted, setIsMuted] = useState(false)

    const audioRef = useRef<HTMLAudioElement>(null)
    const progressBarRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        const audio = audioRef.current
        if (!audio) return

        const setAudioData = () => {
            setDuration(audio.duration)
        }

        const setAudioTime = () => {
            setCurrentTime(audio.currentTime)
        }

        // Assign events
        audio.addEventListener("loadedmetadata", setAudioData)
        audio.addEventListener("timeupdate", setAudioTime)

        // Auto reset when ended
        audio.addEventListener("ended", () => {
            setIsPlaying(false)
            setCurrentTime(0)
            if (audio) audio.currentTime = 0
        })

        return () => {
            // Clean up
            audio.removeEventListener("loadedmetadata", setAudioData)
            audio.removeEventListener("timeupdate", setAudioTime)
            // eslint-disable-next-line react-hooks/exhaustive-deps
            audio.removeEventListener("ended", () => setIsPlaying(false))
        }
    }, [])

    const togglePlayPause = () => {
        const audio = audioRef.current
        if (!audio) return

        if (isPlaying) {
            audio.pause()
        } else {
            audio.play()
        }
        setIsPlaying(!isPlaying)
    }

    const toggleMute = () => {
        const audio = audioRef.current
        if (!audio) return

        audio.muted = !isMuted
        setIsMuted(!isMuted)
    }

    const changeProgress = (e: React.ChangeEvent<HTMLInputElement>) => {
        const audio = audioRef.current
        if (!audio) return

        audio.currentTime = Number(e.target.value)
        setCurrentTime(audio.currentTime)
    }

    const skipTime = (seconds: number) => {
        const audio = audioRef.current
        if (!audio) return

        audio.currentTime += seconds
        setCurrentTime(audio.currentTime)
    }

    const formatTime = (time: number) => {
        if (time && !isNaN(time)) {
            const minutes = Math.floor(time / 60)
            const formatMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`
            const seconds = Math.floor(time % 60)
            const formatSeconds = seconds < 10 ? `0${seconds}` : `${seconds}`
            return `${formatMinutes}:${formatSeconds}`
        }
        return "00:00"
    }

    return (
        <div className="bg-white border rounded-xl overflow-hidden shadow-sm shadow-blue-50">
            <div className="bg-muted/30 p-4 border-b">
                <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-full hidden sm:block">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
                    </div>
                    <div>
                        <h3 className="font-semibold text-sm">{title}</h3>
                        <p className="text-xs text-muted-foreground">Audio file ({formatTime(duration)})</p>
                    </div>
                </div>
            </div>

            <div className="p-4 sm:p-6 space-y-4">
                {/* Hidden Audio Element */}
                <audio ref={audioRef} src={src} preload="metadata" />

                {/* Timeline */}
                <div className="flex items-center gap-3 text-sm text-muted-foreground font-mono">
                    <span className="w-12 text-right">{formatTime(currentTime)}</span>
                    <input
                        type="range"
                        ref={progressBarRef}
                        value={currentTime}
                        max={duration || 0}
                        onChange={changeProgress}
                        className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <span className="w-12">{formatTime(duration)}</span>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between pt-2">
                    <button
                        onClick={toggleMute}
                        className="p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors"
                    >
                        {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                    </button>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => skipTime(-10)}
                            className="p-2 text-muted-foreground hover:text-primary transition-colors"
                            title="Tua lại 10 giây"
                        >
                            <Rewind size={24} />
                        </button>

                        <button
                            onClick={togglePlayPause}
                            className="w-14 h-14 flex items-center justify-center bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shadow-md transition-transform active:scale-95"
                        >
                            {isPlaying ? <Pause size={28} /> : <Play size={28} className="translate-x-0.5" />}
                        </button>

                        <button
                            onClick={() => skipTime(10)}
                            className="p-2 text-muted-foreground hover:text-primary transition-colors"
                            title="Tiến lên 10 giây"
                        >
                            <FastForward size={24} />
                        </button>
                    </div>

                    <div className="w-10"></div> {/* Spacer to center the main controls */}
                </div>
            </div>
        </div>
    )
}
