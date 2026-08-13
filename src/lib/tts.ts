import { KOREAN_PRONUNCIATION_VERSION, toKoreanPronunciationText } from '@/lib/korean-pronunciation'

let activeAudio: HTMLAudioElement | null = null;
let continuousAudio: HTMLAudioElement | null = null;
let preloadAudio: HTMLAudioElement | null = null;
let audioSession = 0;

export type TtsProfile = 'default' | 'math-paced-v1'

interface SpeakTextOptions {
    profile?: TtsProfile
    continuousPlayback?: boolean
}

export function stopTTS() {
    audioSession += 1;
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
    const session = audioSession;
    const audio = options?.continuousPlayback
        ? (continuousAudio ??= new Audio())
        : new Audio();
    audio.onplaying = null;
    audio.onended = null;
    audio.onerror = null;
    audio.preload = 'auto';
    audio.setAttribute('playsinline', 'true');
    audio.src = audioUrl;
    audio.playbackRate = rate;
    activeAudio = audio;

    let settled = false;
    let startupTimer: ReturnType<typeof setTimeout> | null = null;
    const isCurrentSession = () => activeAudio === audio && audioSession === session;
    const clearStartupTimer = () => {
        if (startupTimer) {
            clearTimeout(startupTimer);
            startupTimer = null;
        }
    };
    const finish = () => {
        if (settled || !isCurrentSession()) return;
        clearStartupTimer();
        settled = true;
        activeAudio = null;
        onEnd?.();
    };

    const playBrowserFallback = (reason: unknown) => {
        if (settled || !isCurrentSession()) return;
        clearStartupTimer();
        settled = true;
        try {
            audio.pause();
        } catch {
            // Ignore a pause error from a media element that never started.
        }
        activeAudio = null;
        console.warn("ElevenLabs TTS failed, falling back to browser speechSynthesis:", reason);

        if (!('speechSynthesis' in window)) {
            onError?.(reason);
            onEnd?.();
            return;
        }

        try {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(spokenText);
            utterance.lang = 'ko-KR';
            utterance.rate = rate;
            utterance.onstart = () => onStart?.();
            utterance.onend = () => onEnd?.();
            utterance.onerror = (event) => {
                onError?.(event);
                onEnd?.();
            };
            window.speechSynthesis.speak(utterance);
        } catch (error) {
            onError?.(error);
            onEnd?.();
        }
    };

    audio.onplaying = () => {
        if (isCurrentSession()) {
            clearStartupTimer();
            onStart?.();
        }
    };
    
    audio.onended = () => {
        finish();
    };

    audio.onerror = (e) => {
        playBrowserFallback(e);
    };

    // iOS Safari can leave play() pending indefinitely on a weak connection
    // without firing `error`. Recover with the native Korean voice instead of
    // leaving the passive-listening screen stuck on the current sentence.
    startupTimer = setTimeout(() => {
        playBrowserFallback(new Error('TTS audio startup timed out'));
    }, 12000);

    audio.play().catch(err => {
        // AbortError is normal when audio is paused/stopped by standard React cleanups
        if (err.name !== 'AbortError') {
            playBrowserFallback(err);
        }
    });
}

/**
 * Warm the browser cache for the next sentence without starting playback.
 * This is especially useful on iOS, where waiting for a new MP3 request at
 * every boundary can otherwise leave an audible gap between sentences.
 */
export function preloadSpeechText(text: string, options?: SpeakTextOptions) {
    if (typeof window === 'undefined' || !text.trim()) return;

    const spokenText = options?.profile === 'math-paced-v1'
        ? text
        : toKoreanPronunciationText(text)
    const params = new URLSearchParams({ text: spokenText })
    params.set('pronunciation', KOREAN_PRONUNCIATION_VERSION)
    if (options?.profile && options.profile !== 'default') {
        params.set('profile', options.profile)
    }

    preloadAudio ??= new Audio()
    preloadAudio.preload = 'auto'
    preloadAudio.src = `/api/speech/generate?${params.toString()}`
    preloadAudio.load()
}
