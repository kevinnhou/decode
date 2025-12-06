import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const INITIAL_TIME_SECONDS = 150; // 2:30
const PAUSE_TIME_SECONDS = 120; // 2:00
const FINAL_TIME_SECONDS = 0;

export type TimerState = "idle" | "running" | "paused" | "finished";

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
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const pausedTimeRef = useRef<number>(0);
  const hasAutoPausedRef = useRef<boolean>(false);
  const lastDisplayedSecondRef = useRef<number>(INITIAL_TIME_SECONDS);
  const stateRef = useRef<TimerState>("idle");

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const cancelAnimationFrame = useCallback(() => {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const formatTime = useCallback((seconds: number): string => {
    const rounded = Math.floor(seconds);
    const mins = Math.floor(rounded / 60);
    const secs = rounded % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);

  const updateTimerRef = useRef<(() => void) | undefined>(undefined);

  updateTimerRef.current = () => {
    if (stateRef.current !== "running") {
      return;
    }

    const now = Date.now();
    const elapsed = (now - (startTimeRef.current ?? now)) / 1000;
    const remaining = INITIAL_TIME_SECONDS - elapsed;
    const roundedRemaining = Math.floor(remaining);

    if (roundedRemaining !== lastDisplayedSecondRef.current) {
      lastDisplayedSecondRef.current = roundedRemaining;
      setTimeRemaining(remaining);
    }

    if (
      !hasAutoPausedRef.current &&
      remaining <= PAUSE_TIME_SECONDS &&
      remaining > FINAL_TIME_SECONDS
    ) {
      setTimeRemaining(PAUSE_TIME_SECONDS);
      setState("paused");
      pausedTimeRef.current = elapsed;
      hasAutoPausedRef.current = true;
      cancelAnimationFrame();
      return;
    }

    if (remaining <= FINAL_TIME_SECONDS) {
      setTimeRemaining(FINAL_TIME_SECONDS);
      setState("finished");
      cancelAnimationFrame();
      return;
    }

    if (updateTimerRef.current) {
      animationFrameRef.current = window.requestAnimationFrame(
        updateTimerRef.current
      );
    }
  };

  const start = useCallback(() => {
    if (stateRef.current === "running") {
      return;
    }

    if (stateRef.current === "idle") {
      setStartTimestamp(new Date().toISOString());
      hasAutoPausedRef.current = false;
      lastDisplayedSecondRef.current = INITIAL_TIME_SECONDS;
    }

    setState("running");
    startTimeRef.current = Date.now() - pausedTimeRef.current * 1000;
    if (updateTimerRef.current) {
      animationFrameRef.current = window.requestAnimationFrame(
        updateTimerRef.current
      );
    }
  }, []);

  const pause = useCallback(() => {
    if (stateRef.current !== "running") {
      return;
    }

    const now = Date.now();
    const elapsed = (now - (startTimeRef.current ?? now)) / 1000;
    pausedTimeRef.current = elapsed;

    setState("paused");
    cancelAnimationFrame();
  }, [cancelAnimationFrame]);

  const resume = useCallback(() => {
    if (stateRef.current !== "paused") {
      return;
    }

    setState("running");
    startTimeRef.current = Date.now() - pausedTimeRef.current * 1000;
    if (updateTimerRef.current) {
      animationFrameRef.current = window.requestAnimationFrame(
        updateTimerRef.current
      );
    }
  }, []);

  const reset = useCallback(() => {
    cancelAnimationFrame();
    setTimeRemaining(INITIAL_TIME_SECONDS);
    setState("idle");
    setStartTimestamp(null);
    startTimeRef.current = null;
    pausedTimeRef.current = 0;
    hasAutoPausedRef.current = false;
    lastDisplayedSecondRef.current = INITIAL_TIME_SECONDS;
  }, [cancelAnimationFrame]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame();
    };
  }, [cancelAnimationFrame]);

  const elapsedTime = useMemo(
    () => INITIAL_TIME_SECONDS - timeRemaining,
    [timeRemaining]
  );

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
