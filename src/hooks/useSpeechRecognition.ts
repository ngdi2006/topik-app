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
                setInterimTranscript(currentInterimTranscript)
            }

            recog.onerror = (event: SpeechRecognitionErrorEvent) => {
                console.warn("Speech recognition error:", event.error)
                setIsRecording(false)
                if (event.error === 'not-allowed') {
                    alert("Trình duyệt đã chặn Micro. Vui lòng cấp quyền Micro trên thanh địa chỉ URL của Chrome (Biểu tượng ổ khoá) và thử lại nhé!")
                }
            }

            recog.onend = () => {
                setIsRecording(false)
            }

            recognitionRef.current = recog
        }
    }, [lang])

    const startRecording = useCallback(() => {
        if (!recognitionRef.current) return
        try {
            setTranscript("")
            setInterimTranscript("")
            setIsRecording(true)
            recognitionRef.current.start()
        } catch (e) {
            console.error(e)
        }
    }, [])

    const stopRecording = useCallback(() => {
        if (!recognitionRef.current) return
        setIsRecording(false)
        recognitionRef.current.stop()
    }, [])

    return {
        hasBrowserSupport,
        isRecording,
        transcript,
        interimTranscript,
        startRecording,
        stopRecording,
        resetTranscript: () => {
            setTranscript("")
            setInterimTranscript("")
        }
    }
}
