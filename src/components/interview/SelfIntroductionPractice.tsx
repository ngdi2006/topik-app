'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Captions, CheckCircle2, ChevronDown, Loader2, Mic, Pause, Play, RotateCcw, Save, Sparkles, Square, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { speakText, stopTTS } from '@/lib/tts'
import { readSelfIntroductionDraft, saveSelfIntroductionDraft } from '@/features/second-round-interview/storage'

const DEFAULT_PRACTICE_SECONDS = 60
const MAX_INTRODUCTION_CHARACTERS = 500
const MAX_INTRODUCTION_LINES = 20
const PRACTICE_LEVELS = [
    { seconds: 120, label: 'Làm quen', shortLabel: 'Làm quen' },
    { seconds: 90, label: 'Đọc chậm', shortLabel: 'Chậm' },
    { seconds: 60, label: 'Luyện tập', shortLabel: 'Luyện' },
    { seconds: 40, label: 'Mục tiêu', shortLabel: 'Mục tiêu' },
    { seconds: 30, label: 'Đọc nhanh', shortLabel: 'Nhanh' },
] as const

const SAMPLE_VIDEOS = [
    {
        id: 'c3GtNTtHzHg',
        title: 'Chưa có kinh nghiệm làm việc',
        description: 'Bài giới thiệu mẫu 40 giây dành cho người chưa có kinh nghiệm.',
    },
    {
        id: 'l8FKTpzR3M0',
        title: 'Đã có kinh nghiệm làm việc',
        description: 'Bài giới thiệu mẫu 40 giây dành cho người đã có kinh nghiệm.',
    },
] as const

type ExperienceMode = 'experienced' | 'beginner'
type AudioTarget = 'all' | `line-${number}`
type LearningStep = 1 | 2 | 3

const LEARNING_STEPS: ReadonlyArray<{ id: LearningStep; label: string; shortLabel: string }> = [
    { id: 1, label: 'Xem video mẫu', shortLabel: 'Xem mẫu' },
    { id: 2, label: 'Bài cá nhân', shortLabel: 'Bài của tôi' },
    { id: 3, label: 'Luyện nói', shortLabel: 'Luyện nói' },
]

interface Profile {
    hometown: string
    name: string
    age: string
    occupation: string
    familyCount: string
    height: string
    weight: string
    experienceYears: string
}

const INITIAL_PROFILE: Profile = {
    hometown: '하노이',
    name: '응우옌 반 안',
    age: '25',
    occupation: '용접공',
    familyCount: '4',
    height: '170',
    weight: '65',
    experienceYears: '3',
}

function buildIntroduction(profile: Profile, mode: ExperienceMode) {
    const commonStart = [
        '안녕하십니까? 처음 뵙겠습니다.',
        '자기소개하겠습니다.',
        `저는 ${profile.hometown}에서 온 ${profile.name}(이)라고 합니다.`,
        `올해 저는 ${profile.age}살이고 ${profile.occupation}입니다.`,
        `우리 가족은 ${profile.familyCount}명입니다.`,
        `제 키가 ${profile.height}센티미터이고 몸무게가 ${profile.weight}킬로그램입니다.`,
        '저는 책임감이 있고 끈기가 있으며 어려움을 마다하지 않는 사람입니다.',
    ]
    const experienceLine = mode === 'experienced'
        ? `저는 ${profile.occupation}이고 ${profile.experienceYears}년 동안 이 일을 했습니다. 그래서 이 일을 자신 있게 할 수 있습니다.`
        : '저는 이해가 빠른 사람입니다. 그래서 가르쳐 주시면 일을 빨리 이해하고 익힐 수 있습니다.'

    return [
        ...commonStart,
        experienceLine,
        '저는 일하고 돈을 벌러 한국에 가고 싶습니다.',
        '한국에 가게 되면 열심히 일하겠습니다.',
        '잘 부탁드립니다. 감사드립니다.',
    ]
}

function splitIntroduction(text: string) {
    const explicitLines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
    if (explicitLines.length > 1) return explicitLines

    return (text.match(/[^.!?。！？]+[.!?。！？]?/g) || [])
        .map((line) => line.trim())
        .filter(Boolean)
}

function getKaraokeState(lines: string[], secondsLeft: number, totalSeconds: number) {
    const weights = lines.map((line) => Math.max(12, line.replace(/\s/g, '').length))
    const totalWeight = weights.reduce((total, weight) => total + weight, 0)
    const elapsedRatio = (totalSeconds - secondsLeft) / totalSeconds
    const position = Math.min(totalWeight, Math.max(0, elapsedRatio * totalWeight))
    let consumed = 0

    for (let index = 0; index < lines.length; index += 1) {
        const nextBoundary = consumed + weights[index]
        if (position <= nextBoundary || index === lines.length - 1) {
            const lineProgress = weights[index] > 0
                ? Math.min(1, Math.max(0, (position - consumed) / weights[index]))
                : 0
            return { index, lineProgress }
        }
        consumed = nextBoundary
    }

    return { index: 0, lineProgress: 0 }
}

export function SelfIntroductionPractice({
    onComplete,
}: {
    onComplete: (practiceSeconds: number) => void
}) {
    const [mode, setMode] = useState<ExperienceMode>('experienced')
    const [profile, setProfile] = useState<Profile>(INITIAL_PROFILE)
    const [draftText, setDraftText] = useState('')
    const [showTemplateBuilder, setShowTemplateBuilder] = useState(false)
    const [savedAt, setSavedAt] = useState<string | null>(null)
    const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'local-only'>('idle')
    const [practiceSeconds, setPracticeSeconds] = useState(DEFAULT_PRACTICE_SECONDS)
    const [secondsLeft, setSecondsLeft] = useState(DEFAULT_PRACTICE_SECONDS)
    const [isTimerRunning, setIsTimerRunning] = useState(false)
    const [isPracticePaused, setIsPracticePaused] = useState(false)
    const [hasCompleted, setHasCompleted] = useState(false)
    const [isKaraokeEnabled, setIsKaraokeEnabled] = useState(true)
    const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null)
    const [isRecordedAudioPlaying, setIsRecordedAudioPlaying] = useState(false)
    const [activeStep, setActiveStep] = useState<LearningStep>(1)
    const [showAllLessonLines, setShowAllLessonLines] = useState(false)
    const [audioPlayback, setAudioPlayback] = useState<{
        target: AudioTarget | null
        status: 'idle' | 'loading' | 'playing'
    }>({ target: null, status: 'idle' })
    const completionRecordedRef = useRef(false)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const recordingStreamRef = useRef<MediaStream | null>(null)
    const recordingChunksRef = useRef<Blob[]>([])
    const recordedAudioRef = useRef<HTMLAudioElement | null>(null)
    const {
        hasBrowserSupport,
        transcript,
        interimTranscript,
        startRecording,
        resumeRecording,
        stopRecording,
        resetTranscript,
    } = useSpeechRecognition('ko-KR')

    const lines = useMemo(() => splitIntroduction(draftText), [draftText])
    const fullText = useMemo(() => lines.join(' '), [lines])
    const isWithinDraftLimits = draftText.length <= MAX_INTRODUCTION_CHARACTERS && lines.length <= MAX_INTRODUCTION_LINES
    const canUseAudio = Boolean(savedAt && fullText && isWithinDraftLimits)
    const karaokeState = getKaraokeState(lines, secondsLeft, practiceSeconds)

    const stopUserAudioRecording = useCallback(() => {
        const recorder = mediaRecorderRef.current
        if (recorder && recorder.state !== 'inactive') {
            recorder.stop()
            return
        }
        recordingStreamRef.current?.getTracks().forEach((track) => track.stop())
        recordingStreamRef.current = null
    }, [])

    const startUserAudioRecording = useCallback(async () => {
        if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') return

        recordedAudioRef.current?.pause()
        setIsRecordedAudioPlaying(false)
        setRecordedAudioUrl((currentUrl) => {
            if (currentUrl) URL.revokeObjectURL(currentUrl)
            return null
        })

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            recordingStreamRef.current = stream
            recordingChunksRef.current = []
            const preferredMimeType = [
                'audio/webm;codecs=opus',
                'audio/webm',
                'audio/mp4',
            ].find((mimeType) => MediaRecorder.isTypeSupported(mimeType))
            const recorder = preferredMimeType
                ? new MediaRecorder(stream, { mimeType: preferredMimeType })
                : new MediaRecorder(stream)

            mediaRecorderRef.current = recorder
            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) recordingChunksRef.current.push(event.data)
            }
            recorder.onstop = () => {
                const chunks = recordingChunksRef.current
                if (chunks.length > 0) {
                    const audioBlob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' })
                    setRecordedAudioUrl(URL.createObjectURL(audioBlob))
                }
                stream.getTracks().forEach((track) => track.stop())
                recordingStreamRef.current = null
                mediaRecorderRef.current = null
                recordingChunksRef.current = []
            }
            recorder.start(250)
        } catch (error) {
            console.warn('Unable to record self-introduction audio', error)
            recordingStreamRef.current?.getTracks().forEach((track) => track.stop())
            recordingStreamRef.current = null
        }
    }, [])

    useEffect(() => {
        if (!isTimerRunning) return
        const timerId = window.setTimeout(() => {
            if (secondsLeft <= 1) {
                setSecondsLeft(0)
                setIsTimerRunning(false)
                setIsPracticePaused(false)
                setHasCompleted(true)
                stopRecording()
                stopUserAudioRecording()
                if (!completionRecordedRef.current) {
                    completionRecordedRef.current = true
                    onComplete(practiceSeconds)
                }
                return
            }
            setSecondsLeft(secondsLeft - 1)
        }, 1000)
        return () => window.clearTimeout(timerId)
    }, [isTimerRunning, onComplete, practiceSeconds, secondsLeft, stopRecording, stopUserAudioRecording])

    useEffect(() => () => stopTTS(), [])

    useEffect(() => () => {
        const recorder = mediaRecorderRef.current
        if (recorder && recorder.state !== 'inactive') {
            recorder.onstop = null
            recorder.stop()
        }
        recordingStreamRef.current?.getTracks().forEach((track) => track.stop())
        const audioUrl = recordedAudioRef.current?.src
        if (audioUrl?.startsWith('blob:')) URL.revokeObjectURL(audioUrl)
    }, [])

    useEffect(() => {
        const controller = new AbortController()
        const timerId = window.setTimeout(() => {
            const localDraft = readSelfIntroductionDraft()
            if (localDraft) {
                setMode(localDraft.mode)
                setProfile(localDraft.profile)
                setDraftText(localDraft.text)
                setSavedAt(localDraft.updatedAt)
                setSaveState('local-only')
            }

            void fetch('/api/interview/self-introduction', { signal: controller.signal })
                .then(async (response) => {
                    if (!response.ok) throw new Error('Cannot load cloud draft')
                    return response.json() as Promise<{ draft: typeof localDraft }>
                })
                .then(({ draft: cloudDraft }) => {
                    if (!cloudDraft) {
                        if (localDraft) {
                            void fetch('/api/interview/self-introduction', {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(localDraft),
                            })
                        }
                        return
                    }
                    const shouldUseCloud = !localDraft
                        || Date.parse(cloudDraft.updatedAt) >= Date.parse(localDraft.updatedAt)
                    if (shouldUseCloud) {
                        setMode(cloudDraft.mode)
                        setProfile(cloudDraft.profile)
                        setDraftText(cloudDraft.text)
                        setSavedAt(cloudDraft.updatedAt)
                        saveSelfIntroductionDraft(cloudDraft)
                    }
                    setSaveState('saved')
                })
                .catch((error: unknown) => {
                    if (error instanceof DOMException && error.name === 'AbortError') return
                    if (localDraft) setSaveState('local-only')
                })
        }, 0)
        return () => {
            controller.abort()
            window.clearTimeout(timerId)
        }
    }, [])

    const updateProfile = (field: keyof Profile, value: string) => {
        const next = { ...profile, [field]: value }
        setProfile(next)
    }

    const selectExperienceMode = (nextMode: ExperienceMode) => {
        setMode(nextMode)
    }

    const applyTemplateDraft = () => {
        stopTTS()
        setAudioPlayback({ target: null, status: 'idle' })
        setDraftText(buildIntroduction(profile, mode).join('\n'))
        setSavedAt(null)
        setSaveState('idle')
        setShowTemplateBuilder(false)
    }

    const saveDraft = async () => {
        const text = draftText.trim()
        if (!text || !isWithinDraftLimits) return
        const saved = saveSelfIntroductionDraft({ mode, profile, text })
        setDraftText(text)
        setSavedAt(saved.updatedAt)
        setSaveState('saving')

        try {
            const response = await fetch('/api/interview/self-introduction', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode, profile, text }),
            })
            if (!response.ok) throw new Error('Cloud save failed')
            const result = await response.json() as { updatedAt: string }
            const cloudSaved = saveSelfIntroductionDraft({ mode, profile, text })
            setSavedAt(result.updatedAt || cloudSaved.updatedAt)
            setSaveState('saved')
        } catch {
            setSaveState('local-only')
        }
    }

    const toggleAudio = (target: AudioTarget, text: string, rate: number) => {
        if (audioPlayback.target === target) {
            stopTTS()
            setAudioPlayback({ target: null, status: 'idle' })
            return
        }

        stopTTS()
        setAudioPlayback({ target, status: 'loading' })
        const finishPlayback = () => {
            setAudioPlayback((current) => current.target === target
                ? { target: null, status: 'idle' }
                : current)
        }
        speakText(
            text,
            rate,
            () => setAudioPlayback((current) => current.target === target
                ? { target, status: 'playing' }
                : current),
            finishPlayback,
            finishPlayback,
        )
    }

    const startTimedPractice = () => {
        stopTTS()
        setAudioPlayback({ target: null, status: 'idle' })
        resetTranscript()
        setSecondsLeft(practiceSeconds)
        setHasCompleted(false)
        setIsPracticePaused(false)
        completionRecordedRef.current = false
        setIsTimerRunning(true)
        void startUserAudioRecording()
        if (hasBrowserSupport) startRecording()
    }

    const pauseTimedPractice = () => {
        setIsTimerRunning(false)
        setIsPracticePaused(true)
        stopRecording()
        const recorder = mediaRecorderRef.current
        if (recorder?.state === 'recording') recorder.pause()
    }

    const resumeTimedPractice = () => {
        if (!isPracticePaused || secondsLeft <= 0) return
        setIsPracticePaused(false)
        setIsTimerRunning(true)
        const recorder = mediaRecorderRef.current
        if (recorder?.state === 'paused') recorder.resume()
        if (hasBrowserSupport) resumeRecording()
    }

    const stopTimedPractice = () => {
        setIsTimerRunning(false)
        setIsPracticePaused(false)
        stopRecording()
        stopUserAudioRecording()
    }

    const resetPractice = () => {
        stopTimedPractice()
        resetTranscript()
        setSecondsLeft(practiceSeconds)
        setHasCompleted(false)
        setIsPracticePaused(false)
    }

    const toggleRecordedAudio = async () => {
        const audio = recordedAudioRef.current
        if (!audio) return
        if (audio.paused) {
            try {
                await audio.play()
                setIsRecordedAudioPlaying(true)
            } catch {
                setIsRecordedAudioPlaying(false)
            }
            return
        }
        audio.pause()
        setIsRecordedAudioPlaying(false)
    }

    const selectPracticeSeconds = (seconds: number) => {
        if (isTimerRunning || isPracticePaused) return
        setPracticeSeconds(seconds)
        setSecondsLeft(seconds)
        setHasCompleted(false)
    }

    const selectLearningStep = (step: LearningStep) => {
        if (step === activeStep) return
        stopTTS()
        setAudioPlayback({ target: null, status: 'idle' })
        if (isTimerRunning || isPracticePaused) stopTimedPractice()
        setActiveStep(step)
    }

    return (
        <section className="mx-auto w-full max-w-6xl space-y-3 pb-6 sm:space-y-5 sm:pb-10">
            <header className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-700 via-indigo-700 to-violet-700 p-5 text-white shadow-lg shadow-blue-900/15 sm:rounded-[28px] sm:p-6 md:p-8">
                <div className="relative z-10 flex items-center justify-between gap-4">
                    <div className="max-w-2xl pl-12 sm:pl-14 md:pl-16">
                        <p className="mb-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-blue-100 sm:mb-2 sm:text-xs sm:tracking-[0.2em]">Mở đầu vòng 2</p>
                        <h1 className="max-w-[240px] text-xl font-black leading-tight tracking-tight sm:max-w-none sm:text-2xl md:text-4xl">Giới thiệu bản thân</h1>
                        <p className="mt-2 max-w-[250px] text-xs leading-5 text-blue-100 sm:mt-3 sm:max-w-2xl sm:text-sm md:text-base">Học mẫu, điều chỉnh nhịp và luyện nói theo khả năng.</p>
                    </div>
                    <div className="hidden size-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20 backdrop-blur sm:flex sm:size-20 sm:rounded-3xl">
                        <UserRound className="size-7 sm:size-10" />
                    </div>
                </div>
            </header>

            <nav aria-label="Lộ trình học giới thiệu bản thân" className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm sm:rounded-3xl sm:p-3">
                <ol className="grid grid-cols-3 gap-1 sm:gap-2">
                    {LEARNING_STEPS.map((step) => {
                        const isActive = activeStep === step.id
                        return (
                            <li key={step.id}>
                                <button
                                    aria-current={isActive ? 'step' : undefined}
                                    className={`flex min-h-14 w-full flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-center transition sm:min-h-16 sm:flex-row sm:justify-start sm:gap-2 sm:px-3 ${isActive ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'text-slate-500 hover:bg-blue-50 hover:text-blue-700'}`}
                                    onClick={() => selectLearningStep(step.id)}
                                    type="button"
                                >
                                    <span className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-black sm:size-7 sm:text-xs ${isActive ? 'bg-white text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{step.id}</span>
                                    <span className="text-[10px] font-black leading-3 sm:text-xs md:text-sm">
                                        <span className="sm:hidden">{step.shortLabel}</span>
                                        <span className="hidden sm:inline">{step.label}</span>
                                    </span>
                                </button>
                            </li>
                        )
                    })}
                </ol>
            </nav>

            {activeStep === 1 ? <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[28px] sm:p-5 md:p-7">
                <div className="mb-4 max-w-2xl text-left sm:mx-auto sm:mb-6 sm:text-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-600 sm:text-xs sm:tracking-[0.18em]">Bước 1 · Xem mẫu</p>
                    <h2 className="mt-1.5 text-lg font-black text-slate-950 sm:mt-2 sm:text-xl md:text-2xl">Video mẫu</h2>
                    <p className="mt-1.5 text-xs leading-5 text-slate-500 sm:mt-2 sm:text-sm sm:leading-6">Xem cách trình bày và phát âm.</p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
                    {SAMPLE_VIDEOS.map((video, index) => (
                        <article className="mx-auto w-full max-w-[360px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm md:rounded-3xl" key={video.id}>
                            <div className="relative aspect-[9/16] overflow-hidden bg-slate-950">
                                <iframe
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                    allowFullScreen
                                    className="absolute inset-0 size-full border-0"
                                    loading="lazy"
                                    referrerPolicy="strict-origin-when-cross-origin"
                                    src={`https://www.youtube.com/embed/${video.id}`}
                                    title={video.title}
                                />
                            </div>
                            <div className="p-3 sm:p-4">
                                <div className="flex items-start gap-2.5 sm:gap-3">
                                    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-[11px] font-black text-blue-700 sm:size-8 sm:rounded-xl sm:text-xs">{index + 1}</span>
                                    <div>
                                        <h3 className="text-xs font-black leading-5 text-slate-900 sm:text-sm">{video.title}</h3>
                                        <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-slate-500 sm:mt-1 sm:text-xs sm:leading-5">{video.description}</p>
                                    </div>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            </section> : null}

            {activeStep === 2 ? <div className="grid items-start gap-3 sm:gap-5 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-5 md:p-6">
                    <div className="mb-4 sm:mb-5">
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-black text-slate-950">2. Bài cá nhân của bạn</h2>
                            <span className="rounded-full bg-emerald-100 px-2 py-1 text-[9px] font-black uppercase text-emerald-700">Ưu tiên</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500 sm:text-sm">Viết bài giới thiệu đúng với thông tin và cách nói của riêng bạn.</p>
                    </div>

                    {showTemplateBuilder ? <div className="order-3 mt-4 rounded-2xl border border-blue-100 bg-blue-50/60 p-3 sm:p-4">
                    <div className="mb-3 flex items-start gap-2">
                        <Sparkles className="mt-0.5 size-4 shrink-0 text-blue-600" />
                        <div>
                            <h3 className="text-sm font-black text-slate-900">Tạo bài từ mẫu tham khảo</h3>
                            <p className="mt-0.5 text-[10px] leading-4 text-slate-500">Thông tin mẫu không ghi đè bài cá nhân cho đến khi bạn chủ động sử dụng.</p>
                        </div>
                    </div>
                    <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 sm:gap-2 sm:rounded-2xl sm:p-1.5">
                        <button className={`rounded-lg px-2 py-2 text-xs font-bold transition sm:rounded-xl sm:px-3 sm:py-2.5 sm:text-sm ${mode === 'experienced' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600'}`} onClick={() => selectExperienceMode('experienced')} type="button">Có kinh nghiệm</button>
                        <button className={`rounded-lg px-2 py-2 text-xs font-bold transition sm:rounded-xl sm:px-3 sm:py-2.5 sm:text-sm ${mode === 'beginner' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600'}`} onClick={() => selectExperienceMode('beginner')} type="button">Chưa có kinh nghiệm</button>
                    </div>

                    <div className="grid grid-cols-2 gap-x-2.5 gap-y-3">
                        {([
                            ['hometown', 'Quê quán', '하노이'],
                            ['name', 'Họ và tên', '응우옌 반 안'],
                            ['age', 'Tuổi', '25'],
                            ['occupation', 'Nghề nghiệp', '용접공'],
                            ['familyCount', 'Số người trong gia đình', '4'],
                            ['height', 'Chiều cao (cm)', '170'],
                            ['weight', 'Cân nặng (kg)', '65'],
                            ['experienceYears', 'Số năm kinh nghiệm', '3'],
                        ] as const).map(([field, label, placeholder]) => (
                            <label className={field === 'experienceYears' && mode === 'beginner' ? 'hidden' : 'block'} key={field}>
                                <span className="mb-1 block truncate text-[11px] font-bold text-slate-600 sm:mb-1.5 sm:text-xs">{label}</span>
                                <input className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 sm:h-11 sm:rounded-xl sm:px-3" onChange={(event) => updateProfile(field, event.target.value)} placeholder={placeholder} value={profile[field]} />
                            </label>
                        ))}
                    </div>

                    <Button className="mt-4 w-full rounded-xl" onClick={applyTemplateDraft} type="button" variant="outline">
                        <Sparkles className="size-4" /> Dùng mẫu này cho bài cá nhân
                    </Button>
                    </div> : null}

                    <div className="order-1">
                        <div className="mb-2 flex items-start justify-between gap-3">
                            <div>
                                <h3 className="text-sm font-black text-slate-900">Nội dung sẽ dùng để luyện tập</h3>
                                <p className="mt-0.5 text-[11px] leading-4 text-slate-500">Nhập trực tiếp bài của bạn; mỗi câu nên nằm trên một dòng.</p>
                            </div>
                            <span className="shrink-0 rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">{lines.length} câu</span>
                        </div>
                        <textarea
                            aria-label="Nội dung bài giới thiệu bản thân bằng tiếng Hàn"
                            className="min-h-52 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-medium leading-6 text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                            maxLength={MAX_INTRODUCTION_CHARACTERS}
                            onChange={(event) => {
                                setDraftText(event.target.value)
                                setSavedAt(null)
                                setSaveState('idle')
                            }}
                            placeholder="Nhập bài giới thiệu bằng tiếng Hàn..."
                            spellCheck={false}
                            value={draftText}
                        />
                        <div className="mt-1.5 flex items-center justify-between gap-2 text-[10px] font-semibold">
                            <span className={lines.length > MAX_INTRODUCTION_LINES ? 'text-rose-600' : 'text-slate-400'}>Tối đa {MAX_INTRODUCTION_LINES} câu</span>
                            <span className={draftText.length >= MAX_INTRODUCTION_CHARACTERS * 0.9 ? 'text-amber-600' : 'text-slate-400'}>{draftText.length}/{MAX_INTRODUCTION_CHARACTERS} ký tự</span>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                            <Button className="rounded-xl" onClick={() => void saveDraft()} type="button" disabled={!draftText.trim() || !isWithinDraftLimits || saveState === 'saving'}>
                                {saveState === 'saving' ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} {saveState === 'saving' ? 'Đang lưu...' : 'Lưu bài cá nhân'}
                            </Button>
                            <Button aria-expanded={showTemplateBuilder} className="rounded-xl" onClick={() => setShowTemplateBuilder((visible) => !visible)} type="button" variant="outline">
                                <Sparkles className="size-4" /> {showTemplateBuilder ? 'Đóng phần mẫu' : 'Cần bài mẫu'} <ChevronDown className={`size-4 transition ${showTemplateBuilder ? 'rotate-180' : ''}`} />
                            </Button>
                        </div>
                        <p className={`mt-2 min-h-4 text-[10px] font-semibold ${savedAt ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {savedAt
                                ? saveState === 'local-only'
                                    ? `✓ Đã lưu trên thiết bị lúc ${new Date(savedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}; chưa đồng bộ tài khoản.`
                                    : `✓ Đã lưu vào tài khoản lúc ${new Date(savedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}.`
                                : 'Chỉnh sửa được xem trước ngay; nhấn Lưu để dùng lại lần sau.'}
                        </p>
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-5 md:p-6 lg:sticky lg:top-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <div className="flex items-center gap-2"><h2 className="text-lg font-black text-slate-950">Bản luyện tập hiện tại</h2><span className="rounded-full bg-blue-50 px-2 py-1 text-[9px] font-black uppercase text-blue-700">Bài cá nhân</span></div>
                            <p className="mt-1 text-xs text-slate-500 sm:text-sm">Nội dung đã soạn sẽ được dùng để nghe, chạy chữ tự động và luyện nói.</p>
                        </div>
                        <Button
                            aria-pressed={audioPlayback.target === 'all'}
                            className={audioPlayback.target === 'all' ? 'rounded-xl border-blue-600 bg-blue-600 text-white hover:bg-blue-700 hover:text-white' : 'rounded-xl'}
                            disabled={!canUseAudio}
                            onClick={() => toggleAudio('all', fullText, 0.9)}
                            variant="outline"
                        >
                            {audioPlayback.target === 'all' && audioPlayback.status === 'loading' ? (
                                <Loader2 className="size-4 animate-spin" />
                            ) : audioPlayback.target === 'all' ? (
                                <Square className="size-3.5 fill-current" />
                            ) : (
                                <Play className="size-4" />
                            )}
                            {audioPlayback.target === 'all'
                                ? audioPlayback.status === 'loading' ? 'Đang tải...' : 'Dừng nghe'
                                : 'Nghe toàn bài'}
                        </Button>
                    </div>
                    {!savedAt && fullText ? <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-700">Hãy lưu bài cá nhân trước khi nghe hoặc luyện nói để tránh tạo âm thanh cho nội dung chưa hoàn chỉnh.</p> : null}
                    {!lines.length ? <div className="mt-4 rounded-2xl border border-dashed border-blue-200 bg-blue-50/60 p-6 text-center">
                        <Sparkles className="mx-auto size-7 text-blue-500" />
                        <p className="mt-2 text-sm font-black text-slate-800">Hãy viết bài giới thiệu của bạn</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">Bạn có thể tự viết hoàn toàn hoặc mở “Cần bài mẫu” để tham khảo.</p>
                    </div> : null}
                    <div className="mt-4 space-y-2 sm:mt-5 sm:max-h-[440px] sm:overflow-y-auto sm:pr-1">
                        {lines.map((line, index) => (
                            <button
                                aria-pressed={audioPlayback.target === `line-${index}`}
                                className={`${!showAllLessonLines && index >= 4 ? 'hidden sm:flex' : 'flex'} group w-full items-start gap-2 rounded-xl border p-2.5 text-left transition sm:gap-3 sm:rounded-2xl sm:p-3 ${audioPlayback.target === `line-${index}` ? 'border-blue-300 bg-blue-50 ring-2 ring-blue-100' : 'border-slate-100 bg-slate-50 hover:border-blue-200 hover:bg-blue-50'}`}
                                key={`${index}-${line}`}
                                disabled={!canUseAudio}
                                onClick={() => toggleAudio(`line-${index}`, line, 1.0)}
                                type="button"
                            >
                                <span className={`flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-black shadow-sm ${audioPlayback.target === `line-${index}` ? 'bg-blue-600 text-white' : 'bg-white text-blue-700'}`}>{index + 1}</span>
                                <span className="min-w-0 flex-1">
                                    <span className="block text-sm font-semibold leading-6 text-slate-800">{line}</span>
                                    {audioPlayback.target === `line-${index}` ? (
                                        <span className="mt-0.5 block text-[10px] font-black uppercase tracking-wider text-blue-600">
                                            {audioPlayback.status === 'loading' ? 'Đang tải âm thanh' : 'Đang nghe · Bấm để dừng'}
                                        </span>
                                    ) : null}
                                </span>
                                {audioPlayback.target === `line-${index}` && audioPlayback.status === 'loading' ? (
                                    <Loader2 className="mt-1 size-4 shrink-0 animate-spin text-blue-600" />
                                ) : audioPlayback.target === `line-${index}` ? (
                                    <Square className="mt-1 size-3.5 shrink-0 fill-current text-blue-600" />
                                ) : (
                                    <Play className="mt-1 size-4 shrink-0 text-slate-400 group-hover:text-blue-600" />
                                )}
                            </button>
                        ))}
                    </div>
                    <button className="mt-3 w-full rounded-xl bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 sm:hidden" onClick={() => setShowAllLessonLines((visible) => !visible)} type="button">
                        {showAllLessonLines ? 'Thu gọn bài nói' : `Xem đủ ${lines.length} câu`}
                    </button>
                </div>
            </div> : null}

            {activeStep === 3 ? <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[28px] sm:p-5 md:p-7">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h2 className="text-base font-black leading-6 text-slate-950 sm:text-lg">3. Luyện nói theo mục tiêu</h2>
                        <p className="mt-0.5 text-xs leading-5 text-slate-500 sm:mt-1 sm:text-sm">Bắt đầu dễ, sau đó giảm về 40 giây.</p>
                    </div>
                </div>

                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-2.5 sm:mt-5 sm:rounded-2xl sm:p-4">
                    <div className="mb-2 sm:mb-3">
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-wider text-slate-700 sm:text-xs">Chọn thời gian</p>
                            <p className="mt-0.5 hidden text-xs leading-4 text-slate-500 sm:block">Chữ chạy tự điều chỉnh theo thời gian.</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                        {PRACTICE_LEVELS.map((level) => (
                            <button
                                aria-label={`${level.label}, ${level.seconds} giây`}
                                className={`min-w-0 rounded-lg border px-1 py-1.5 text-center transition disabled:cursor-not-allowed disabled:opacity-50 sm:rounded-xl sm:px-3 sm:py-2.5 sm:text-left ${practiceSeconds === level.seconds ? 'border-blue-600 bg-blue-600 text-white shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'}`}
                                disabled={isTimerRunning || isPracticePaused}
                                key={level.seconds}
                                onClick={() => selectPracticeSeconds(level.seconds)}
                                type="button"
                            >
                                <span className={`block truncate text-[8px] font-bold sm:text-[10px] ${practiceSeconds === level.seconds ? 'text-blue-100' : 'text-slate-500'}`}>{level.shortLabel}</span>
                                <strong className="mt-0.5 block text-[11px] font-black sm:text-sm">{level.seconds}<span className="ml-0.5 text-[7px] font-bold sm:text-[10px]">s</span></strong>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 sm:mt-4 sm:rounded-2xl sm:px-4 sm:py-3">
                    <div className="flex min-w-0 items-center gap-3">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700 sm:size-9 sm:rounded-xl">
                            <Captions className="size-4 sm:size-5" />
                        </span>
                        <div className="min-w-0">
                            <p className="text-xs font-black text-slate-900 sm:text-sm">Chạy chữ tự động</p>
                            <p className="truncate text-[10px] text-slate-500 sm:text-xs">Đọc theo câu tô sáng</p>
                        </div>
                    </div>
                    <button
                        aria-label="Bật hoặc tắt chạy chữ tự động"
                        aria-checked={isKaraokeEnabled}
                        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${isKaraokeEnabled ? 'bg-blue-600' : 'bg-slate-300'}`}
                        onClick={() => setIsKaraokeEnabled((enabled) => !enabled)}
                        role="switch"
                        type="button"
                    >
                        <span className={`absolute left-1 top-1 size-5 rounded-full bg-white shadow-sm transition-transform ${isKaraokeEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                </div>

                {isKaraokeEnabled ? (
                    <div aria-live="polite" className="relative mt-3 overflow-hidden rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-violet-50 px-3 py-4 text-center sm:mt-4 sm:rounded-2xl sm:px-6 sm:py-5">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-left text-[10px] font-black uppercase tracking-[0.14em] text-blue-600 sm:tracking-[0.18em]">
                                Câu {karaokeState.index + 1}/{lines.length} · Nhịp {practiceSeconds} giây
                            </p>
                            <div className={`flex min-w-16 shrink-0 items-baseline justify-center gap-1 rounded-full border px-3 py-1.5 shadow-sm ${secondsLeft <= 10 ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-blue-200 bg-white/90 text-blue-700'}`}>
                                <strong className="text-lg font-black tabular-nums sm:text-xl">{secondsLeft}</strong>
                                <span className="text-[9px] font-black uppercase">giây</span>
                            </div>
                        </div>
                        <div
                            className="relative mt-2 h-[288px] select-none overflow-hidden [--row-height:96px] sm:mt-3 sm:h-[324px] sm:[--row-height:108px]"
                            lang="ko"
                            style={{ fontFamily: '"Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif' }}
                        >
                            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-10 h-12 bg-gradient-to-b from-blue-50 to-transparent" />
                            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-12 bg-gradient-to-t from-violet-50 to-transparent" />
                            <div
                                className="transition-transform duration-700 ease-out motion-reduce:transition-none"
                                style={{ transform: `translateY(calc(var(--row-height) * ${1 - karaokeState.index}))` }}
                            >
                                {lines.map((line, lineIndex) => {
                                    const isActive = lineIndex === karaokeState.index
                                    const highlightedWords = isActive
                                        ? Math.ceil(karaokeState.lineProgress * line.split(/\s+/).length)
                                        : 0
                                    let wordIndex = 0
                                    return (
                                        <p
                                            className={`flex h-[var(--row-height)] items-center justify-center overflow-hidden px-2 leading-[1.65] tracking-[0.01em] transition-all duration-500 sm:px-4 ${isActive ? 'scale-100 text-xl font-bold text-slate-400 opacity-100 sm:text-[28px]' : lineIndex < karaokeState.index ? 'scale-95 text-sm font-medium text-slate-400 opacity-30 sm:text-base' : 'scale-95 text-sm font-medium text-slate-500 opacity-45 sm:text-base'}`}
                                            key={`${lineIndex}-${line}`}
                                        >
                                                <span className={isActive ? 'block break-keep [word-break:keep-all]' : 'line-clamp-1 break-keep [word-break:keep-all]'}>
                                                {line.split(/(\s+)/).map((part, partIndex) => {
                                                    if (part.trim()) wordIndex += 1
                                                    return (
                                                        <span className={isActive && part.trim() && wordIndex <= highlightedWords ? 'text-blue-700 transition-colors duration-300' : 'transition-colors duration-300'} key={`${partIndex}-${part}`}>
                                                            {part}
                                                        </span>
                                                    )
                                                })}
                                            </span>
                                        </p>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                ) : null}

                <div className="mt-3 grid grid-cols-[1fr_auto] gap-2 sm:mt-5 sm:flex sm:flex-wrap sm:gap-3">
                    {!isTimerRunning && !isPracticePaused ? (
                        <Button className="min-h-11 rounded-xl bg-blue-600 px-3 text-xs font-bold hover:bg-blue-700 sm:min-h-12 sm:px-6 sm:text-sm" disabled={!canUseAudio} onClick={startTimedPractice}>
                            <Mic className="size-5" /> Bắt đầu · {practiceSeconds} giây
                        </Button>
                    ) : isTimerRunning ? (
                        <Button className="min-h-11 rounded-xl px-3 text-xs font-bold sm:min-h-12 sm:px-6 sm:text-sm" onClick={pauseTimedPractice} variant="destructive">
                            <Pause className="size-5" /> Tạm dừng
                        </Button>
                    ) : (
                        <Button className="min-h-11 rounded-xl bg-emerald-600 px-3 text-xs font-bold hover:bg-emerald-700 sm:min-h-12 sm:px-6 sm:text-sm" onClick={resumeTimedPractice}>
                            <Play className="size-5" /> Tiếp tục · còn {secondsLeft} giây
                        </Button>
                    )}
                    <Button className="min-h-11 rounded-xl px-3 text-xs font-bold sm:min-h-12 sm:px-5 sm:text-sm" onClick={resetPractice} variant="outline">
                        <RotateCcw className="size-4" /> Làm lại
                    </Button>
                </div>

                <div aria-live="polite" className="mt-3 min-h-20 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:mt-5 sm:min-h-24 sm:rounded-2xl sm:p-4">
                    <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">Kết quả nhận diện giọng nói</p>
                    <p className="mt-1.5 text-xs font-semibold leading-5 text-slate-800 sm:mt-2 sm:text-sm sm:leading-6">
                        {transcript}<span className="text-slate-400"> {interimTranscript}</span>
                        {!transcript && !interimTranscript ? 'Nội dung bạn nói sẽ xuất hiện tại đây.' : null}
                    </p>
                    {!hasBrowserSupport ? <p className="mt-2 text-xs font-semibold text-amber-700">Trình duyệt không hỗ trợ nhận diện giọng nói. Bộ đếm và chữ chạy vẫn hoạt động bình thường.</p> : null}
                </div>

                {recordedAudioUrl && !isTimerRunning ? (
                    <div className="mt-3 flex flex-col gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3 sm:mt-4 sm:flex-row sm:items-center sm:justify-between sm:rounded-2xl sm:p-4">
                        <div className="min-w-0">
                            <p className="text-sm font-black text-slate-900">Bản ghi vừa hoàn thành</p>
                            <p className="mt-0.5 text-xs text-slate-600">Nghe lại để kiểm tra phát âm và tốc độ nói.</p>
                        </div>
                        <Button className="min-h-10 shrink-0 rounded-xl px-4 text-xs font-bold sm:text-sm" onClick={toggleRecordedAudio} variant="outline">
                            {isRecordedAudioPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
                            {isRecordedAudioPlaying ? 'Tạm dừng' : 'Nghe lại bài vừa nói'}
                        </Button>
                        <audio
                            className="hidden"
                            onEnded={() => setIsRecordedAudioPlaying(false)}
                            onPause={() => setIsRecordedAudioPlaying(false)}
                            ref={recordedAudioRef}
                            src={recordedAudioUrl}
                        />
                    </div>
                ) : null}

                {hasCompleted ? (
                    <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-800 sm:mt-4 sm:gap-3 sm:rounded-2xl sm:p-4">
                        <CheckCircle2 className="size-5 shrink-0 sm:size-6" />
                        <div><p className="text-sm font-black">Hoàn thành {practiceSeconds} giây</p><p className="text-xs sm:text-sm">Hãy giảm thời gian khi đã đọc tự nhiên hơn.</p></div>
                    </div>
                ) : null}
            </div> : null}
        </section>
    )
}
