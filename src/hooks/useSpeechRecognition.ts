"use client"

import { useState, useEffect, useCallback, useRef } from 'react';
interface SpeechRecognitionEvent {
    resultIndex: number;
    results: {
        [index: number]: {
            [index: number]: {
                transcript: string;
            };
            isFinal: boolean;
        };
        length: number;
    };
}

interface SpeechRecognitionErrorEvent {
    error: string;
    message: string;
}

export function useSpeechRecognition(lang: string = 'ko-KR') {
    const [hasBrowserSupport] = useState(() => {
        if (typeof window === "undefined") return false;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        return !!SpeechRecognition;
    })
    const [isRecording, setIsRecording] = useState(false)
    const [transcript, setTranscript] = useState("")
    const [interimTranscript, setInterimTranscript] = useState("")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognitionRef = useRef<any>(null)
    const isRecordingRef = useRef(false)
    const interimTranscriptRef = useRef("")
    const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

        if (SpeechRecognition) {
            const recog = new SpeechRecognition()

            // Configure
            recog.continuous = true
            recog.interimResults = true
            recog.lang = lang

            recog.onresult = (event: SpeechRecognitionEvent) => {
                let finalTranscript = ''
                let currentInterimTranscript = ''

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const results = event.results as any

                for (let i = event.resultIndex; i < results.length; ++i) {
                    if (results[i].isFinal) {
                        finalTranscript += results[i][0].transcript
                    } else {
                        currentInterimTranscript += results[i][0].transcript
                    }
                }

                if (finalTranscript) {
                    setTranscript((prev) => prev + " " + finalTranscript)
                }
                interimTranscriptRef.current = currentInterimTranscript
                setInterimTranscript(currentInterimTranscript)
            }

            recog.onerror = (event: SpeechRecognitionErrorEvent) => {
                console.warn("Speech recognition error:", event.error)
                const isFatalError = event.error === 'not-allowed'
                    || event.error === 'service-not-allowed'
                    || event.error === 'audio-capture'

                if (isFatalError) {
                    isRecordingRef.current = false
                    setIsRecording(false)
                }

                if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                    alert("Trình duyệt đã chặn Micro. Vui lòng cấp quyền Micro trên thanh địa chỉ URL của Chrome (Biểu tượng ổ khoá) và thử lại nhé!")
                }
            }

            recog.onend = () => {
                if (interimTranscriptRef.current.trim()) {
                    const unfinishedText = interimTranscriptRef.current.trim()
                    setTranscript((prev) => `${prev} ${unfinishedText}`.trim())
                    interimTranscriptRef.current = ""
                    setInterimTranscript("")
                }

                if (!isRecordingRef.current) {
                    setIsRecording(false)
                    return
                }

                // Chrome can close a long-running recognition session after silence
                // or an internal duration limit. Reconnect while the caller still
                // expects recording, preserving the accumulated transcript.
                restartTimerRef.current = setTimeout(() => {
                    if (!isRecordingRef.current || !recognitionRef.current) return
                    try {
                        recognitionRef.current.start()
                        setIsRecording(true)
                    } catch (error) {
                        console.warn("Could not restart speech recognition:", error)
                        isRecordingRef.current = false
                        setIsRecording(false)
                    }
                }, 300)
            }

            recognitionRef.current = recog
        }

        return () => {
            isRecordingRef.current = false
            if (restartTimerRef.current) clearTimeout(restartTimerRef.current)
            restartTimerRef.current = null
            try {
                recognitionRef.current?.abort()
            } catch {
                // Recognition may already be inactive during cleanup.
            }
            recognitionRef.current = null
        }
    }, [lang])

    const startRecording = useCallback(() => {
        if (!recognitionRef.current || isRecordingRef.current) return
        try {
            isRecordingRef.current = true
            setIsRecording(true)
            setTranscript("")
            setInterimTranscript("")
            interimTranscriptRef.current = ""
            recognitionRef.current.start()
        } catch (e) {
            console.warn("Could not start speech recognition:", e)
            isRecordingRef.current = false
            setIsRecording(false)
        }
    }, [])

    const resumeRecording = useCallback(() => {
        if (!recognitionRef.current || isRecordingRef.current) return
        try {
            isRecordingRef.current = true
            setIsRecording(true)
            recognitionRef.current.start()
        } catch (e) {
            console.warn("Could not resume speech recognition:", e)
            isRecordingRef.current = false
            setIsRecording(false)
        }
    }, [])

    const stopRecording = useCallback(() => {
        if (!recognitionRef.current) return
        isRecordingRef.current = false
        setIsRecording(false)
        if (restartTimerRef.current) clearTimeout(restartTimerRef.current)
        restartTimerRef.current = null
        try {
            recognitionRef.current.stop()
        } catch {
            // Recognition may have ended naturally just before this call.
        }
    }, [])

    return {
        hasBrowserSupport,
        isRecording,
        transcript,
        interimTranscript,
        startRecording,
        resumeRecording,
        stopRecording,
        resetTranscript: () => {
            setTranscript("")
            setInterimTranscript("")
            interimTranscriptRef.current = ""
        }
    }
}
