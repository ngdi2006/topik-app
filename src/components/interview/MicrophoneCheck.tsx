'use client'

import { useEffect, useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, Mic, RotateCcw, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'

type MicrophoneCheckProps = {
    onReadyChange: (ready: boolean) => void
}

type TestStatus = 'idle' | 'requesting' | 'listening' | 'ready' | 'weak' | 'denied' | 'unsupported'

const STATUS_COPY: Record<TestStatus, string> = {
    idle: 'Chưa kiểm tra micro',
    requesting: 'Đang xin quyền sử dụng micro…',
    listening: 'Đang ghi thử — hãy nói một câu tiếng Hàn',
    ready: 'Micro hoạt động tốt',
    weak: 'Tín hiệu quá nhỏ — hãy đưa micro gần hơn và thử lại',
    denied: 'Chưa được cấp quyền micro',
    unsupported: 'Trình duyệt không hỗ trợ kiểm tra micro',
}

export function MicrophoneCheck({ onReadyChange }: MicrophoneCheckProps) {
    const [status, setStatus] = useState<TestStatus>('idle')
    const [level, setLevel] = useState(0)
    const [recordingUrl, setRecordingUrl] = useState<string | null>(null)
    const streamRef = useRef<MediaStream | null>(null)
    const recorderRef = useRef<MediaRecorder | null>(null)
    const audioContextRef = useRef<AudioContext | null>(null)
    const animationFrameRef = useRef<number | null>(null)
    const chunksRef = useRef<Blob[]>([])
    const peakLevelRef = useRef(0)
    const lastMeterUpdateRef = useRef(0)

    const releaseCapture = () => {
        if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
        streamRef.current?.getTracks().forEach((track) => track.stop())
        streamRef.current = null
        void audioContextRef.current?.close()
        audioContextRef.current = null
        setLevel(0)
    }

    useEffect(() => () => {
        releaseCapture()
        if (recordingUrl) URL.revokeObjectURL(recordingUrl)
    }, [recordingUrl])

    const finishTest = () => {
        const recorder = recorderRef.current
        if (recorder?.state === 'recording') recorder.stop()
        releaseCapture()
    }

    const startTest = async () => {
        if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
            setStatus('unsupported')
            onReadyChange(false)
            return
        }

        setStatus('requesting')
        onReadyChange(false)
        if (recordingUrl) {
            URL.revokeObjectURL(recordingUrl)
            setRecordingUrl(null)
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            })
            streamRef.current = stream
            chunksRef.current = []
            peakLevelRef.current = 0

            const recorder = new MediaRecorder(stream)
            recorderRef.current = recorder
            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) chunksRef.current.push(event.data)
            }
            recorder.onstop = () => {
                if (chunksRef.current.length > 0) {
                    setRecordingUrl(URL.createObjectURL(new Blob(chunksRef.current, { type: recorder.mimeType })))
                }
                const ready = peakLevelRef.current >= 0.035
                setStatus(ready ? 'ready' : 'weak')
                onReadyChange(ready)
            }
            recorder.start()

            const AudioContextClass = window.AudioContext
            const context = new AudioContextClass()
            audioContextRef.current = context
            const analyser = context.createAnalyser()
            analyser.fftSize = 256
            context.createMediaStreamSource(stream).connect(analyser)
            const values = new Uint8Array(analyser.frequencyBinCount)

            const updateMeter = (timestamp: number) => {
                analyser.getByteFrequencyData(values)
                const average = values.reduce((sum, value) => sum + value, 0) / values.length / 255
                peakLevelRef.current = Math.max(peakLevelRef.current, average)
                if (timestamp - lastMeterUpdateRef.current > 80) {
                    setLevel(Math.min(1, average * 3.2))
                    lastMeterUpdateRef.current = timestamp
                }
                animationFrameRef.current = requestAnimationFrame(updateMeter)
            }
            animationFrameRef.current = requestAnimationFrame(updateMeter)
            setStatus('listening')
        } catch (error) {
            releaseCapture()
            const denied = error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'SecurityError')
            setStatus(denied ? 'denied' : 'unsupported')
            onReadyChange(false)
        }
    }

    const isReady = status === 'ready'
    const isListening = status === 'listening'
    const hasError = status === 'weak' || status === 'denied' || status === 'unsupported'

    return (
        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4" aria-labelledby="microphone-check-title">
            <div className="flex items-start gap-3">
                <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${isReady ? 'bg-emerald-100 text-emerald-700' : hasError ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                    {isReady ? <CheckCircle2 aria-hidden="true" className="size-5" /> : hasError ? <AlertCircle aria-hidden="true" className="size-5" /> : <Mic aria-hidden="true" className="size-5" />}
                </span>
                <div className="min-w-0 flex-1">
                    <h3 id="microphone-check-title" className="text-sm font-black text-slate-900">Kiểm tra micro trước khi thi</h3>
                    <p className="mt-0.5 text-[11px] leading-4 text-slate-500 sm:text-xs">Cấp quyền, nói thử rồi nghe lại bản ghi để kiểm tra âm lượng.</p>
                </div>
            </div>

            <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex items-center justify-between gap-3 text-xs font-bold">
                    <span className={isReady ? 'text-emerald-700' : hasError ? 'text-amber-700' : 'text-slate-700'} aria-live="polite">{STATUS_COPY[status]}</span>
                    {isListening ? <span className="shrink-0 tabular-nums text-red-600">Đang thu</span> : null}
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100" aria-label="Mức tín hiệu micro" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(level * 100)}>
                    <div className={`h-full rounded-full transition-[width] duration-100 ${level > 0.72 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.max(isListening ? 3 : 0, level * 100)}%` }} />
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                    {isListening ? (
                        <Button type="button" onClick={finishTest} className="h-9 rounded-lg bg-red-600 text-xs font-bold hover:bg-red-700">
                            <Square aria-hidden="true" className="size-3.5 fill-current" /> Kết thúc kiểm tra
                        </Button>
                    ) : (
                        <Button type="button" onClick={startTest} variant={isReady ? 'outline' : 'default'} className="h-9 rounded-lg text-xs font-bold">
                            {isReady ? <RotateCcw aria-hidden="true" className="size-3.5" /> : <Mic aria-hidden="true" className="size-3.5" />}
                            {isReady ? 'Kiểm tra lại' : 'Bắt đầu kiểm tra'}
                        </Button>
                    )}
                    {recordingUrl ? (
                        <audio className="h-9 min-w-0 flex-1" controls preload="metadata" src={recordingUrl} aria-label="Nghe lại bản ghi kiểm tra micro" />
                    ) : null}
                </div>
            </div>

            {status === 'denied' ? (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-4 text-amber-900 sm:text-xs">
                    <p className="font-black">Cách cấp lại quyền micro</p>
                    <p className="mt-1">Chrome/Edge: biểu tượng ổ khóa cạnh địa chỉ → Microphone → Cho phép. Safari iPhone: aA → Cài đặt trang web → Microphone → Cho phép. Sau đó tải lại trang.</p>
                </div>
            ) : null}
        </section>
    )
}
