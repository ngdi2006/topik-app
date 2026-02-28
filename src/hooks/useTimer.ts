import { useState, useEffect, useCallback } from 'react';

export function useTimer(initialSeconds: number, onTimeUp?: () => void) {
    const [seconds, setSeconds] = useState(initialSeconds);
    const [isActive, setIsActive] = useState(false);

    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;

        if (isActive && seconds > 0) {
            interval = setInterval(() => {
                setSeconds((prevSeconds) => prevSeconds - 1);
            }, 1000);
        } else if (seconds === 0 && isActive) {
            // Use setTimeout to avoid synchronous state updates during render
            setTimeout(() => {
                setIsActive(false);
                if (onTimeUp) onTimeUp();
            }, 0);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isActive, seconds, onTimeUp]);

    const start = useCallback(() => setIsActive(true), []);
    const pause = useCallback(() => setIsActive(false), []);
    const reset = useCallback((newSeconds: number = initialSeconds) => {
        setSeconds(newSeconds);
        setIsActive(false);
    }, [initialSeconds]);

    const formatTime = () => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    return { seconds, formatTime, start, pause, reset, isActive };
}
