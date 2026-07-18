let activeAudio: HTMLAudioElement | null = null;

export function stopTTS() {
    if (activeAudio) {
        try {
            activeAudio.pause();
        } catch (e) {
            // Ignore pause errors on already stopped streams
        }
        activeAudio = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
            window.speechSynthesis.cancel();
        } catch (e) {
            // Ignore speech synthesis cancels
        }
    }
}

export function speakText(
    text: string, 
    rate: number = 1.0, 
    onStart?: () => void, 
    onEnd?: () => void, 
    onError?: (err: any) => void
) {
    stopTTS();
    
    if (typeof window === 'undefined') return;

    // Build the query url for ElevenLabs stream endpoint
    const audioUrl = `/api/speech/generate?text=${encodeURIComponent(text)}`;
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
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = 'ko-KR';
                utterance.rate = 0.9 * rate;
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
