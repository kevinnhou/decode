import { useCallback, useEffect, useRef, useState } from "react";

const INITIAL_TIME_SECONDS = 150; // 2:30
const PAUSE_TIME_SECONDS = 120; // 2:00
const FINAL_TIME_SECONDS = 0;

type TimerState = "idle" | "running" | "paused" | "finished";

interface UseMatchTimerReturn {
  timeRemaining: number;
  elapsedTime: number;
  state: TimerState;
  startTimestamp: string | null;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  formatTime: (seconds: number) => string;
  getEventTimestamp: () => string;
}

export function useMatchTimer(): UseMatchTimerReturn {
  const [timeRemaining, setTimeRemaining] = useState(INITIAL_TIME_SECONDS);
  const [state, setState] = useState<TimerState>("idle");
  const [startTimestamp, setStartTimestamp] = useState<string | null>(null);
  const intervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const pausedTimeRef = useRef<number>(0);
  const hasAutoPausedRef = useRef<boolean>(false);

  const clearInterval = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);

  const start = useCallback(() => {
    if (state === "running") {
      return;
    }

    if (state === "idle") {
      setStartTimestamp(new Date().toISOString());
      hasAutoPausedRef.current = false;
    }

    setState("running");
    startTimeRef.current = Date.now() - pausedTimeRef.current * 1000;

    intervalRef.current = window.setInterval(() => {
      const now = Date.now();
      const elapsed = (now - (startTimeRef.current ?? now)) / 1000;
      const remaining = INITIAL_TIME_SECONDS - elapsed;

      // auto pause at 2:00
      if (
        !hasAutoPausedRef.current &&
        remaining <= PAUSE_TIME_SECONDS &&
        remaining > FINAL_TIME_SECONDS
      ) {
        setTimeRemaining(PAUSE_TIME_SECONDS);
        setState("paused");
        pausedTimeRef.current = elapsed;
        hasAutoPausedRef.current = true;
        clearInterval();
      } else if (remaining <= FINAL_TIME_SECONDS) {
        // Timer finished
        setTimeRemaining(FINAL_TIME_SECONDS);
        setState("finished");
        clearInterval();
      } else {
        setTimeRemaining(remaining);
      }
    }, 100);
  }, [state, clearInterval]);

  const pause = useCallback(() => {
    if (state !== "running") {
      return;
    }

    const now = Date.now();
    const elapsed = (now - (startTimeRef.current ?? now)) / 1000;
    pausedTimeRef.current = elapsed;

    setState("paused");
    clearInterval();
  }, [state, clearInterval]);

  const resume = useCallback(() => {
    if (state !== "paused") {
      return;
    }

    setState("running");
    startTimeRef.current = Date.now() - pausedTimeRef.current * 1000;

    intervalRef.current = window.setInterval(() => {
      const now = Date.now();
      const elapsed = (now - (startTimeRef.current ?? now)) / 1000;
      const remaining = INITIAL_TIME_SECONDS - elapsed;

      if (remaining <= FINAL_TIME_SECONDS) {
        setTimeRemaining(FINAL_TIME_SECONDS);
        setState("finished");
        clearInterval();
      } else {
        setTimeRemaining(remaining);
      }
    }, 100);
  }, [state, clearInterval]);

  const reset = useCallback(() => {
    clearInterval();
    setTimeRemaining(INITIAL_TIME_SECONDS);
    setState("idle");
    setStartTimestamp(null);
    startTimeRef.current = null;
    pausedTimeRef.current = 0;
    hasAutoPausedRef.current = false;
  }, [clearInterval]);

  useEffect(() => {
    return () => {
      clearInterval();
    };
  }, [clearInterval]);

  const elapsedTime = INITIAL_TIME_SECONDS - timeRemaining;

  const getEventTimestamp = useCallback((): string => {
    const currentElapsed = INITIAL_TIME_SECONDS - timeRemaining;
    return formatTime(currentElapsed);
  }, [timeRemaining, formatTime]);

  return {
    timeRemaining,
    elapsedTime,
    state,
    startTimestamp,
    start,
    pause,
    resume,
    reset,
    formatTime,
    getEventTimestamp,
  };
}


