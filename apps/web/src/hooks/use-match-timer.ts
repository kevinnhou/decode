import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const INITIAL_TIME_SECONDS = 150; // 2:30
export const PAUSE_TIME_SECONDS = 120; // 2:00
const FINAL_TIME_SECONDS = 0;

export type TimerState = "idle" | "running" | "paused" | "finished";

export type FrcPeriod =
  | "AUTO"
  | "TRANSITION"
  | "SHIFT_1"
  | "SHIFT_2"
  | "SHIFT_3"
  | "SHIFT_4"
  | "END_GAME";

const FRC_PERIOD_BOUNDARIES: { end: number; period: FrcPeriod }[] = [
  { end: 20, period: "AUTO" },
  { end: 33, period: "TRANSITION" }, // 23-33 (gap 20-23 returns TRANSITION)
  { end: 58, period: "SHIFT_1" },
  { end: 83, period: "SHIFT_2" },
  { end: 108, period: "SHIFT_3" },
  { end: 133, period: "SHIFT_4" },
  { end: 150, period: "END_GAME" },
];

function getFrcPeriodFromElapsed(elapsedSeconds: number): FrcPeriod {
  for (const { end, period } of FRC_PERIOD_BOUNDARIES) {
    if (elapsedSeconds <= end) {
      return period;
    }
  }
  return "END_GAME";
}

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

interface UseMatchTimerFRCReturn extends UseMatchTimerReturn {
  getCurrentPeriod: () => FrcPeriod;
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

  useEffect(
    () => () => {
      cancelAnimationFrame();
    },
    [cancelAnimationFrame]
  );

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

/**
 * FRC match timer variant: 2:30 countdown with no pause, plus REBUILT period mapping.
 * Use for FRC match scouting.
 */
export function useMatchTimerFRC(): UseMatchTimerFRCReturn {
  const [timeRemaining, setTimeRemaining] = useState(INITIAL_TIME_SECONDS);
  const [state, setState] = useState<TimerState>("idle");
  const [startTimestamp, setStartTimestamp] = useState<string | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const pausedTimeRef = useRef<number>(0);
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
    lastDisplayedSecondRef.current = INITIAL_TIME_SECONDS;
  }, [cancelAnimationFrame]);

  useEffect(
    () => () => {
      cancelAnimationFrame();
    },
    [cancelAnimationFrame]
  );

  const elapsedTime = useMemo(
    () => INITIAL_TIME_SECONDS - timeRemaining,
    [timeRemaining]
  );

  const getEventTimestamp = useCallback((): string => {
    const currentElapsed = INITIAL_TIME_SECONDS - timeRemaining;
    return formatTime(currentElapsed);
  }, [timeRemaining, formatTime]);

  const getCurrentPeriod = useCallback((): FrcPeriod => {
    const elapsed = INITIAL_TIME_SECONDS - timeRemaining;
    return getFrcPeriodFromElapsed(elapsed);
  }, [timeRemaining]);

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
    getCurrentPeriod,
  };
}

export type FrcActionType = "scoring" | "feeding" | "defense";

export interface UsePeriodActionTimerReturn {
  isRunning: boolean;
  elapsedSeconds: number;
  start: () => void;
  stop: () => { period: FrcPeriod; duration: number } | null;
  reset: () => void;
}

/**
 * Per-action timer for FRC period slides (Scoring, Feeding, Defence).
 * Duration is attributed to the period when the timer was started.
 * Timers carry over across periods; on stop, attribution uses startPeriod.
 */
export function usePeriodActionTimer(
  getCurrentPeriod: () => FrcPeriod
): UsePeriodActionTimerReturn {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const startPeriodRef = useRef<FrcPeriod | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const updateElapsed = useCallback(() => {
    if (startTimeRef.current === null) {
      return;
    }

    const elapsed = (Date.now() - startTimeRef.current) / 1000;
    setElapsedSeconds(elapsed);

    if (animationFrameRef.current !== null) {
      animationFrameRef.current = window.requestAnimationFrame(updateElapsed);
    }
  }, []);

  const start = useCallback(() => {
    if (startTimeRef.current !== null) {
      return;
    }

    startPeriodRef.current = getCurrentPeriod();
    startTimeRef.current = Date.now();
    setElapsedSeconds(0);
    setIsRunning(true);
    animationFrameRef.current = window.requestAnimationFrame(updateElapsed);
  }, [getCurrentPeriod, updateElapsed]);

  const stop = useCallback((): {
    period: FrcPeriod;
    duration: number;
  } | null => {
    if (startTimeRef.current === null || startPeriodRef.current === null) {
      return null;
    }

    const duration = (Date.now() - startTimeRef.current) / 1000;
    const period = startPeriodRef.current;

    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    startTimeRef.current = null;
    startPeriodRef.current = null;
    setIsRunning(false);
    setElapsedSeconds(0);

    return { period, duration };
  }, []);

  const reset = useCallback(() => {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    startTimeRef.current = null;
    startPeriodRef.current = null;
    setIsRunning(false);
    setElapsedSeconds(0);
  }, []);

  useEffect(
    () => () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    },
    []
  );

  return {
    isRunning,
    elapsedSeconds,
    start,
    stop,
    reset,
  };
}
