import { KOREAN_PRONUNCIATION_VERSION, toKoreanPronunciationText } from '@/lib/korean-pronunciation'

let activeAudio: HTMLAudioElement | null = null;

export type TtsProfile = 'default' | 'math-paced-v1'

interface SpeakTextOptions {
    profile?: TtsProfile
}

export function stopTTS() {
    if (activeAudio) {
        try {
            activeAudio.pause();
        } catch {
            // Ignore pause errors on already stopped streams
        }
        activeAudio = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
            window.speechSynthesis.cancel();
        } catch {
            // Ignore speech synthesis cancels
        }
    }
}

export function speakTextWithBrowser(
    text: string,
    rate: number = 1.0,
    onStart?: () => void,
    onEnd?: () => void,
) {
    stopTTS()
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        onEnd?.()
        return false
    }

    const utterance = new SpeechSynthesisUtterance(toKoreanPronunciationText(text))
    utterance.lang = 'ko-KR'
    utterance.rate = rate
    utterance.onstart = () => onStart?.()
    utterance.onend = () => onEnd?.()
    utterance.onerror = () => onEnd?.()
    window.speechSynthesis.speak(utterance)
    return true
}

export function speakText(
    text: string, 
    rate: number = 1.0, 
    onStart?: () => void, 
    onEnd?: () => void, 
    onError?: (err: unknown) => void,
    options?: SpeakTextOptions,
) {
    stopTTS();
    
    if (typeof window === 'undefined') return;

    // Build the query url for ElevenLabs stream endpoint
    const spokenText = options?.profile === 'math-paced-v1'
        ? text
        : toKoreanPronunciationText(text)
    const params = new URLSearchParams({ text: spokenText })
    params.set('pronunciation', KOREAN_PRONUNCIATION_VERSION)
    if (options?.profile && options.profile !== 'default') {
        params.set('profile', options.profile)
    }
    const audioUrl = `/api/speech/generate?${params.toString()}`;
    const audio = new Audio(audioUrl);
    audio.playbackRate = rate;
    activeAudio = audio;

    if (onStart) audio.onplay = () => onStart();
    
    audio.onended = () => {
        if (activeAudio === audio) activeAudio = null;
        if (onEnd) onEnd();
    };

    audio.onerror = (e) => {
        console.warn("ElevenLabs TTS failed, falling back to browser speechSynthesis:", e);
        if (activeAudio === audio) activeAudio = null;
        
        // Fallback to native browser speech synthesis
        if ('speechSynthesis' in window) {
            try {
                window.speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance(spokenText);
                utterance.lang = 'ko-KR';
                utterance.rate = rate;
                if (onStart) utterance.onstart = () => onStart();
                if (onEnd) utterance.onend = () => onEnd();
                if (onError) utterance.onerror = () => onEnd ? onEnd() : null;
                window.speechSynthesis.speak(utterance);
            } catch (err) {
                console.error("Browser speech synthesis failed:", err);
                if (onEnd) onEnd();
            }
        } else {
            if (onEnd) onEnd();
        }
    };

    audio.play().catch(err => {
        // AbortError is normal when audio is paused/stopped by standard React cleanups
        if (err.name !== 'AbortError') {
            console.warn("ElevenLabs play blocked or failed, calling fallback:", err);
            audio.onerror?.(err);
        }
    });
}
