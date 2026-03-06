"use client";

import { Button } from "@decode/ui/components/button";
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
import { useCallback } from "react";
import type { FrcPeriod } from "@/hooks/use-match-timer";
import { FRC_PERIOD_TO_KEY } from "@/lib/form/constants";
import { FRC_CLIMB_LEVELS } from "@/lib/form/field-groups";
import type {
  FrcMatchSubmissionSchema,
  FrcPeriodDataMap,
} from "@/schema/scouting";

const PERIOD_LABELS: Record<FrcPeriod, string> = {
  AUTO: "AUTO",
  TRANSITION: "Transition",
  SHIFT_1: "Shift 1",
  SHIFT_2: "Shift 2",
  SHIFT_3: "Shift 3",
  SHIFT_4: "Shift 4",
  END_GAME: "End Game",
};

function formatSeconds(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface ActionTimerProps {
  label: string;
  isRunning: boolean;
  elapsedSeconds: number;
  onStart: () => void;
  onStop: () => void;
}

function ActionTimer({
  label,
  isRunning,
  elapsedSeconds,
  onStart,
  onStop,
}: ActionTimerProps) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-4">
      <span className="font-medium text-muted-foreground text-sm">{label}</span>
      <div className="flex items-center justify-between gap-4">
        <span className="font-mono text-2xl tabular-nums">
          {formatSeconds(elapsedSeconds)}
        </span>
        <Button
          className="font-mono"
          onClick={() => {
            if (isRunning) {
              onStop();
            } else {
              onStart();
            }
          }}
          size="sm"
          type="button"
          variant={isRunning ? "destructive" : "default"}
        >
          {isRunning ? "Stop" : "Start"}
        </Button>
      </div>
    </div>
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
  form?: UseFormReturn<FrcMatchSubmissionSchema>;
}

export function PeriodSlide({
  period,
  onPeriodDataChange,
  scoringTimer,
  feedingTimer,
  defenseTimer,
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
      <h2 className="font-semibold text-xl">{PERIOD_LABELS[period]}</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <ActionTimer
          elapsedSeconds={scoringTimer.elapsedSeconds}
          isRunning={scoringTimer.isRunning}
          label="Scoring"
          onStart={scoringTimer.start}
          onStop={() => handleStop(scoringTimer.flush, "scoring")}
        />
        <ActionTimer
          elapsedSeconds={feedingTimer.elapsedSeconds}
          isRunning={feedingTimer.isRunning}
          label="Feeding"
          onStart={feedingTimer.start}
          onStop={() => handleStop(feedingTimer.flush, "feeding")}
        />
        <ActionTimer
          elapsedSeconds={defenseTimer.elapsedSeconds}
          isRunning={defenseTimer.isRunning}
          label="Defence"
          onStart={defenseTimer.start}
          onStop={() => handleStop(defenseTimer.flush, "defense")}
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
