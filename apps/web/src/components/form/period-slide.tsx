"use client";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@decode/ui/components/form";
import { Input } from "@decode/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@decode/ui/components/select";
import type { UseFormReturn } from "@decode/ui/lib/react-hook-form";
import { cn } from "@decode/ui/lib/utils";
import { useCallback } from "react";
import type { FrcPeriod } from "@/hooks/use-match-timer";
import { FRC_PERIOD_TO_KEY } from "@/lib/form/constants";
import { FRC_CLIMB_LEVELS } from "@/lib/form/field-groups";
import { formatShortcutKey } from "@/lib/shortcuts";
import type {
  FrcMatchSubmissionSchema,
  FrcPeriodDataMap,
} from "@/schema/scouting";

function formatSeconds(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface ActionTimerProps {
  label: string;
  isRunning: boolean;
  elapsedSeconds: number;
  shortcutKey?: string;
  onStart: () => void;
  onStop: () => void;
}

function ActionTimer({
  label,
  isRunning,
  elapsedSeconds,
  shortcutKey,
  onStart,
  onStop,
}: ActionTimerProps) {
  return (
    <button
      className={cn(
        "relative flex w-full flex-col gap-4 overflow-hidden rounded-xl border-2 p-5 text-left transition-all duration-200",
        isRunning
          ? "border-primary bg-primary/5 hover:bg-primary/10 active:scale-[0.98]"
          : "border-border bg-muted/20 hover:bg-muted/30 active:scale-[0.98]"
      )}
      onClick={() => {
        if (isRunning) {
          onStop();
        } else {
          onStart();
        }
      }}
      type="button"
    >
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "size-2 rounded-full transition-colors",
            isRunning ? "animate-pulse bg-primary" : "bg-muted-foreground/30"
          )}
        />
        <span className="font-medium text-sm">{label}</span>
        {shortcutKey ? (
          <kbd className="ml-auto rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            {formatShortcutKey(shortcutKey)}
          </kbd>
        ) : null}
      </div>

      <div className="flex items-end justify-between gap-3">
        <span
          className={cn(
            "font-mono font-semibold tabular-nums transition-colors",
            isRunning
              ? "text-4xl text-foreground"
              : "text-4xl text-muted-foreground/60"
          )}
        >
          {formatSeconds(elapsedSeconds)}
        </span>
        <span
          className={cn(
            "rounded-md px-3 py-1.5 font-medium text-sm transition-colors",
            isRunning
              ? "bg-destructive text-destructive-foreground"
              : "bg-primary text-primary-foreground"
          )}
        >
          {isRunning ? "Stop" : "Start"}
        </span>
      </div>
    </button>
  );
}

interface ActionTimerControls {
  isRunning: boolean;
  elapsedSeconds: number;
  start: () => void;
  flush: () => { period: FrcPeriod; duration: number }[];
}

interface PeriodSlideProps {
  period: FrcPeriod;
  onPeriodDataChange: (
    updater: (prev: FrcPeriodDataMap) => FrcPeriodDataMap
  ) => void;
  scoringTimer: ActionTimerControls;
  feedingTimer: ActionTimerControls;
  defenseTimer: ActionTimerControls;
  shortcuts?: { scoring: string; feeding: string; defense: string };
  form?: UseFormReturn<FrcMatchSubmissionSchema>;
}

export function PeriodSlide({
  period,
  onPeriodDataChange,
  scoringTimer,
  feedingTimer,
  defenseTimer,
  shortcuts,
  form,
}: PeriodSlideProps) {
  const handleStop = useCallback(
    (
      flushFn: () => { period: FrcPeriod; duration: number }[],
      action: "scoring" | "feeding" | "defense"
    ) => {
      const segments = flushFn();
      if (segments.length === 0) {
        return;
      }

      onPeriodDataChange((prev) => {
        const updated = { ...prev };
        for (const segment of segments) {
          const key = FRC_PERIOD_TO_KEY[segment.period];
          updated[key] = {
            ...updated[key],
            [action]: updated[key][action] + segment.duration,
          };
        }
        return updated;
      });
    },
    [onPeriodDataChange]
  );

  const isEndGame = period === "END_GAME";
  const showClimb = isEndGame && form !== undefined && form !== null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <ActionTimer
          elapsedSeconds={scoringTimer.elapsedSeconds}
          isRunning={scoringTimer.isRunning}
          label="Scoring"
          onStart={scoringTimer.start}
          onStop={() => handleStop(scoringTimer.flush, "scoring")}
          shortcutKey={shortcuts?.scoring}
        />
        <ActionTimer
          elapsedSeconds={feedingTimer.elapsedSeconds}
          isRunning={feedingTimer.isRunning}
          label="Feeding"
          onStart={feedingTimer.start}
          onStop={() => handleStop(feedingTimer.flush, "feeding")}
          shortcutKey={shortcuts?.feeding}
        />
        <ActionTimer
          elapsedSeconds={defenseTimer.elapsedSeconds}
          isRunning={defenseTimer.isRunning}
          label="Defence"
          onStart={defenseTimer.start}
          onStop={() => handleStop(defenseTimer.flush, "defense")}
          shortcutKey={shortcuts?.defense}
        />
      </div>

      {showClimb ? (
        <section className="border-t pt-6">
          <h3 className="mb-4 font-medium text-base">Climb</h3>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="climbLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Climb Level</FormLabel>
                  <Select
                    onValueChange={(value) =>
                      field.onChange(Number(value) as 0 | 1 | 2 | 3)
                    }
                    value={String(field.value)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {FRC_CLIMB_LEVELS.map(({ value, label }) => (
                        <SelectItem key={value} value={String(value)}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="climbDuration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Climb Duration (seconds)</FormLabel>
                  <FormControl>
                    <Input
                      inputMode="decimal"
                      min={0}
                      step={0.1}
                      type="number"
                      {...field}
                      onChange={(e) => {
                        const v = e.target.value;
                        field.onChange(v === "" ? 0 : Number(v));
                      }}
                      value={
                        field.value === undefined || field.value === null
                          ? ""
                          : String(field.value)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}
