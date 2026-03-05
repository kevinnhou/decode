"use client";

import { Button } from "@decode/ui/components/button";
import { cn } from "@decode/ui/lib/utils";
import { Pause, Play, RotateCcw } from "lucide-react";
import type { ReactNode } from "react";
import { type FrcPeriod, INITIAL_TIME_SECONDS } from "@/hooks/use-match-timer";

type TimerState = "idle" | "running" | "paused" | "finished";

const FRC_PERIODS: FrcPeriod[] = [
  "AUTO",
  "TRANSITION",
  "SHIFT_1",
  "SHIFT_2",
  "SHIFT_3",
  "SHIFT_4",
  "END_GAME",
];

function formatPeriodLabel(period: FrcPeriod): string {
  if (period.startsWith("SHIFT_")) {
    return period.replace("SHIFT_", "S");
  }
  return period.replace("_", " ");
}

interface MatchTimerProps {
  timeRemaining: number;
  state: TimerState;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  formatTime: (seconds: number) => string;
  header?: ReactNode;
}

export function MatchTimer({
  timeRemaining,
  state,
  start,
  pause,
  resume,
  reset,
  formatTime,
  header,
}: MatchTimerProps) {
  return (
    <div className="relative overflow-hidden rounded-xl border bg-muted/30 p-4 transition-colors hover:bg-muted/40">
      {header ? <div className="mb-3">{header}</div> : null}
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col">
          <span className="font-medium text-[10px] text-muted-foreground uppercase italic tracking-wider">
            {state === "idle" && "Ready"}
            {state === "running" && "Running"}
            {state === "paused" && "Paused"}
            {state === "finished" && "Finished"}
          </span>
          <div
            className={cn(
              "font-mono font-semibold text-3xl tabular-nums tracking-tight transition-colors",
              timeRemaining <= 10 && state === "running" && "text-red-500",
              state === "paused" && "text-muted-foreground"
            )}
          >
            {formatTime(timeRemaining)}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {state === "idle" && (
            <Button
              className="size-10 rounded-full"
              onClick={start}
              size="icon"
              type="button"
            >
              <Play className="size-4 fill-current" />
            </Button>
          )}

          {state === "running" && (
            <Button
              className="size-10 rounded-full"
              onClick={pause}
              size="icon"
              type="button"
              variant="secondary"
            >
              <Pause className="size-4 fill-current" />
            </Button>
          )}

          {state === "paused" && (
            <>
              <Button
                className="size-10 rounded-full"
                onClick={resume}
                size="icon"
                type="button"
              >
                <Play className="size-4 fill-current" />
              </Button>
              <Button
                className="size-10 rounded-full text-muted-foreground hover:text-foreground"
                onClick={reset}
                size="icon"
                type="button"
                variant="ghost"
              >
                <RotateCcw className="size-4" />
              </Button>
            </>
          )}

          {state === "finished" && (
            <Button
              className="size-10 rounded-full"
              onClick={reset}
              size="icon"
              type="button"
              variant="outline"
            >
              <RotateCcw className="size-4" />
            </Button>
          )}
        </div>
      </div>

      <div
        className="absolute bottom-0 left-0 h-1 bg-primary/20 transition-all duration-1000 ease-linear"
        style={{ width: `${(timeRemaining / INITIAL_TIME_SECONDS) * 100}%` }}
      />
    </div>
  );
}

interface MatchTimerFRCProps extends MatchTimerProps {
  getCurrentPeriod: () => FrcPeriod;
}

export function MatchTimerFRC({
  getCurrentPeriod,
  ...props
}: MatchTimerFRCProps) {
  const currentPeriod = getCurrentPeriod();
  const currentIndex = FRC_PERIODS.indexOf(currentPeriod);

  const periodHeader = (
    <div className="space-y-1.5">
      <div
        aria-valuemax={FRC_PERIODS.length}
        aria-valuemin={1}
        aria-valuenow={currentIndex + 1}
        className="flex gap-px overflow-hidden rounded-full"
        role="progressbar"
      >
        {FRC_PERIODS.map((period, i) => {
          const isActive = period === currentPeriod;
          const isPast = i < currentIndex;
          return (
            <div
              className={cn(
                "h-1 min-w-0 flex-1 transition-colors",
                isActive
                  ? "bg-primary"
                  : isPast
                    ? "bg-primary/30"
                    : "bg-muted/30"
              )}
              key={period}
              title={formatPeriodLabel(period)}
            />
          );
        })}
      </div>
      <p className="font-bold font-mono text-[10px] text-muted-foreground">
        {formatPeriodLabel(currentPeriod)}
      </p>
    </div>
  );

  return <MatchTimer {...props} header={periodHeader} />;
}
