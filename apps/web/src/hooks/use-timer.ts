import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FrcPeriod, FtcPeriod, TimerState } from "@/lib/form/constants";
import {
  FINAL_TIME_SECONDS,
  FRC_PERIOD_BOUNDARIES,
  FTC_INITIAL_TIME_SECONDS,
  FTC_PERIOD_BOUNDARIES,
  INITIAL_TIME_SECONDS,
  PAUSE_TIME_SECONDS,
} from "@/lib/form/constants";

function getFrcPeriodFromElapsed(elapsedSeconds: number): FrcPeriod {
  for (const { end, period } of FRC_PERIOD_BOUNDARIES) {
    if (elapsedSeconds <= end) {
      return period;
    }
  }
  return "END_GAME";
}

export function getFrcPeriodProgress(elapsedSeconds: number): {
  period: FrcPeriod;
  periodDuration: number;
  elapsedInPeriod: number;
  timeRemainingInPeriod: number;
} {
  const period = getFrcPeriodFromElapsed(elapsedSeconds);
  const bounds = FRC_PERIOD_BOUNDARIES.find((b) => b.period === period);
  if (!bounds) {
    return {
      period: "END_GAME",
      periodDuration: 30,
      elapsedInPeriod: 30,
      timeRemainingInPeriod: 0,
    };
  }
  const periodDuration = bounds.end - bounds.start;
  const elapsedInPeriod = Math.min(
    elapsedSeconds - bounds.start,
    periodDuration
  );
  const timeRemainingInPeriod = Math.max(0, periodDuration - elapsedInPeriod);
  return { period, periodDuration, elapsedInPeriod, timeRemainingInPeriod };
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

export function getFtcPeriodFromElapsed(elapsedSeconds: number): FtcPeriod {
  for (const { end, period } of FTC_PERIOD_BOUNDARIES) {
    if (elapsedSeconds <= end) {
      return period;
    }
  }
  return "TELEOP";
}

export function getFtcPeriodProgress(elapsedSeconds: number): {
  period: FtcPeriod;
  periodDuration: number;
  elapsedInPeriod: number;
  timeRemainingInPeriod: number;
} {
  const period = getFtcPeriodFromElapsed(elapsedSeconds);
  const bounds = FTC_PERIOD_BOUNDARIES.find((b) => b.period === period);
  if (!bounds) {
    return {
      period: "TELEOP",
      periodDuration: 120,
      elapsedInPeriod: 120,
      timeRemainingInPeriod: 0,
    };
  }
  const periodDuration = bounds.end - bounds.start;
  const elapsedInPeriod = Math.min(
    elapsedSeconds - bounds.start,
    periodDuration
  );
  const timeRemainingInPeriod = Math.max(0, periodDuration - elapsedInPeriod);
  return { period, periodDuration, elapsedInPeriod, timeRemainingInPeriod };
}

interface UseMatchTimerFTCReturn extends UseMatchTimerReturn {
  getCurrentPeriod: () => FtcPeriod;
}

export function useMatchTimerFTC(): UseMatchTimerFTCReturn {
  const [timeRemaining, setTimeRemaining] = useState(FTC_INITIAL_TIME_SECONDS);
  const [state, setState] = useState<TimerState>("idle");
  const [startTimestamp, setStartTimestamp] = useState<string | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const pausedTimeRef = useRef<number>(0);
  const lastDisplayedSecondRef = useRef<number>(FTC_INITIAL_TIME_SECONDS);
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
    const remaining = FTC_INITIAL_TIME_SECONDS - elapsed;
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
      lastDisplayedSecondRef.current = FTC_INITIAL_TIME_SECONDS;
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
    setTimeRemaining(FTC_INITIAL_TIME_SECONDS);
    setState("idle");
    setStartTimestamp(null);
    startTimeRef.current = null;
    pausedTimeRef.current = 0;
    lastDisplayedSecondRef.current = FTC_INITIAL_TIME_SECONDS;
  }, [cancelAnimationFrame]);

  useEffect(
    () => () => {
      cancelAnimationFrame();
    },
    [cancelAnimationFrame]
  );

  const elapsedTime = useMemo(
    () => FTC_INITIAL_TIME_SECONDS - timeRemaining,
    [timeRemaining]
  );

  const getEventTimestamp = useCallback((): string => {
    const currentElapsed = FTC_INITIAL_TIME_SECONDS - timeRemaining;
    return formatTime(currentElapsed);
  }, [timeRemaining, formatTime]);

  const getCurrentPeriod = useCallback((): FtcPeriod => {
    const elapsed = FTC_INITIAL_TIME_SECONDS - timeRemaining;
    return getFtcPeriodFromElapsed(elapsed);
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
  flush: () => { period: FrcPeriod; duration: number }[];
  reset: () => void;
  tick: (matchElapsed: number) => void;
}

export function usePeriodActionTimer(): UsePeriodActionTimerReturn {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const activeStartElapsedRef = useRef<number | null>(null);
  const activePeriodRef = useRef<FrcPeriod | null>(null);
  const completedSegmentsRef = useRef<
    { period: FrcPeriod; duration: number }[]
  >([]);
  const lastMatchElapsedRef = useRef<number>(0);
  const pendingStartRef = useRef<boolean>(false);
  const isRunningRef = useRef<boolean>(false);

  const start = useCallback(() => {
    if (isRunningRef.current) {
      return;
    }
    pendingStartRef.current = true;
    isRunningRef.current = true;
    completedSegmentsRef.current = [];
    setIsRunning(true);
    setElapsedSeconds(0);
  }, []);

  const tick = useCallback((matchElapsed: number) => {
    lastMatchElapsedRef.current = matchElapsed;

    if (!isRunningRef.current) {
      return;
    }

    if (pendingStartRef.current) {
      activeStartElapsedRef.current = matchElapsed;
      activePeriodRef.current = getFrcPeriodFromElapsed(matchElapsed);
      pendingStartRef.current = false;
      setElapsedSeconds(0);
      return;
    }

    if (
      activeStartElapsedRef.current === null ||
      activePeriodRef.current === null
    ) {
      return;
    }

    const currentPeriod = getFrcPeriodFromElapsed(matchElapsed);

    if (activePeriodRef.current !== currentPeriod) {
      const bounds = FRC_PERIOD_BOUNDARIES.find(
        (b) => b.period === activePeriodRef.current
      );
      const boundaryElapsed = bounds?.end ?? matchElapsed;
      const segmentDuration = boundaryElapsed - activeStartElapsedRef.current;

      if (segmentDuration > 0) {
        completedSegmentsRef.current.push({
          period: activePeriodRef.current,
          duration: segmentDuration,
        });
      }

      activeStartElapsedRef.current = boundaryElapsed;
      activePeriodRef.current = currentPeriod;
      setElapsedSeconds(matchElapsed - boundaryElapsed);
      return;
    }

    setElapsedSeconds(matchElapsed - activeStartElapsedRef.current);
  }, []);

  const flush = useCallback((): { period: FrcPeriod; duration: number }[] => {
    if (
      !isRunningRef.current ||
      activeStartElapsedRef.current === null ||
      activePeriodRef.current === null
    ) {
      return [];
    }

    const matchElapsed = lastMatchElapsedRef.current;
    const finalDuration = matchElapsed - activeStartElapsedRef.current;

    if (finalDuration > 0) {
      completedSegmentsRef.current.push({
        period: activePeriodRef.current,
        duration: finalDuration,
      });
    }

    const result = [...completedSegmentsRef.current];

    isRunningRef.current = false;
    activeStartElapsedRef.current = null;
    activePeriodRef.current = null;
    completedSegmentsRef.current = [];
    pendingStartRef.current = false;
    setIsRunning(false);
    setElapsedSeconds(0);

    return result;
  }, []);

  const reset = useCallback(() => {
    isRunningRef.current = false;
    activeStartElapsedRef.current = null;
    activePeriodRef.current = null;
    completedSegmentsRef.current = [];
    pendingStartRef.current = false;
    setIsRunning(false);
    setElapsedSeconds(0);
  }, []);

  return {
    isRunning,
    elapsedSeconds,
    start,
    flush,
    reset,
    tick,
  };
}
