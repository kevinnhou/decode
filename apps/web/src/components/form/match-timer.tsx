"use client";

import { Button } from "@decode/ui/components/button";
import { cn } from "@decode/ui/lib/utils";
import { Pause, Play, RotateCcw } from "lucide-react";

type TimerState = "idle" | "running" | "paused" | "finished";

interface MatchTimerProps {
  timeRemaining: number;
  state: TimerState;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  formatTime: (seconds: number) => string;
}

export function MatchTimer({
  timeRemaining,
  state,
  start,
  pause,
  resume,
  reset,
  formatTime,
}: MatchTimerProps) {
  return (
    <div className="relative overflow-hidden rounded-xl border bg-muted/30 p-4 transition-colors hover:bg-muted/40">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col">
          <span className="font-medium text-[10px] text-muted-foreground uppercase tracking-wider">
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

      {/* Progress indicator background (optional, maybe too much?) */}
      <div
        className="absolute bottom-0 left-0 h-1 bg-primary/20 transition-all duration-1000 ease-linear"
        style={{ width: `${(timeRemaining / 150) * 100}%` }}
      />
    </div>
  );
}
