"use client";

import { Button } from "@decode/ui/components/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@decode/ui/components/form";
import { Textarea } from "@decode/ui/components/textarea";
import type { UseFormReturn } from "@decode/ui/lib/react-hook-form";
import { FRC_CLIMB_LEVELS } from "@/lib/form";
import type {
  FrcAutoPath,
  FrcFieldEvent,
  FrcMatchSubmissionSchema,
  FrcPeriodDataMap,
} from "@/schema/scouting";

const PERIOD_LABELS: Record<keyof FrcPeriodDataMap, string> = {
  auto: "AUTO",
  transition: "Transition",
  shift1: "Shift 1",
  shift2: "Shift 2",
  shift3: "Shift 3",
  shift4: "Shift 4",
  endGame: "End Game",
};

function formatSeconds(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatFrcEventLabel(ev: FrcFieldEvent): string {
  const type = ev.eventType.charAt(0).toUpperCase() + ev.eventType.slice(1);
  const extras: string[] = [];
  if (ev.action) {
    extras.push(ev.action);
  }
  if (ev.source) {
    extras.push(ev.source);
  }
  if (ev.climbLevel) {
    extras.push(`L${ev.climbLevel}`);
  }
  const suffix = extras.length ? ` (${extras.join(", ")})` : "";
  return `${type}${suffix} · ${ev.startTimestamp}–${ev.endTimestamp} · ${ev.duration.toFixed(1)}s`;
}

interface SummaryViewProps {
  periodData?: FrcPeriodDataMap;
  frcFieldEvents?: FrcFieldEvent[];
  autoPath?: FrcAutoPath;
  form: UseFormReturn<FrcMatchSubmissionSchema>;
  isSubmitting: boolean;
  onSubmit: () => void;
  onReset: () => void;
}

export function SummaryView({
  periodData,
  frcFieldEvents,
  autoPath,
  form,
  isSubmitting,
  onSubmit,
  onReset,
}: SummaryViewProps) {
  const climbLevel = form.watch("climbLevel");
  const climbLabel =
    FRC_CLIMB_LEVELS.find((l) => l.value === climbLevel)?.label ?? "—";

  return (
    <div className="space-y-6">
      <h2 className="font-semibold text-xl">Match Summary</h2>

      {periodData !== undefined && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Period</th>
                <th className="px-4 py-3 text-right font-mono">Scoring</th>
                <th className="px-4 py-3 text-right font-mono">Feeding</th>
                <th className="px-4 py-3 text-right font-mono">Defence</th>
              </tr>
            </thead>
            <tbody>
              {(Object.keys(periodData) as (keyof FrcPeriodDataMap)[]).map(
                (key) => (
                  <tr className="border-b last:border-0" key={key}>
                    <td className="px-4 py-2 font-medium">
                      {PERIOD_LABELS[key]}
                    </td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums">
                      {formatSeconds(periodData[key].scoring)}
                    </td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums">
                      {formatSeconds(periodData[key].feeding)}
                    </td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums">
                      {formatSeconds(periodData[key].defense)}
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}

      {frcFieldEvents !== undefined && frcFieldEvents.length > 0 && (
        <div className="rounded-lg border p-4">
          <h3 className="mb-2 font-medium text-sm">Field Events</h3>
          <ul className="space-y-1 text-sm">
            {frcFieldEvents.map((ev, i) => (
              <li key={`${i}-${ev.startTimestamp}`}>
                {formatFrcEventLabel(ev)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {autoPath !== undefined && autoPath.length > 0 && (
        <div className="rounded-lg border p-4">
          <h3 className="mb-2 font-medium text-sm">AUTO Path</h3>
          <p className="text-muted-foreground text-sm">
            {autoPath.length} point{autoPath.length !== 1 ? "s" : ""} recorded
          </p>
        </div>
      )}

      <div className="rounded-lg border p-4">
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <span className="text-muted-foreground text-xs">Climb Level</span>
            <p className="font-medium">{climbLabel}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">
              Climb Duration
            </span>
            <p className="font-medium font-mono">
              {form.watch("climbDuration")}s
            </p>
          </div>
        </div>
      </div>

      <div>
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (optional)</FormLabel>
              <FormControl>
                <Textarea
                  className="min-h-24 resize-none"
                  placeholder="Additional notes..."
                  rows={4}
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
            </FormItem>
          )}
        />
      </div>

      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
        <Button
          className="rounded-xl font-mono"
          disabled={isSubmitting}
          onClick={onReset}
          type="button"
          variant="destructive"
        >
          Reset
        </Button>
        <Button
          className="w-full rounded-xl font-mono sm:w-auto"
          disabled={isSubmitting}
          onClick={onSubmit}
          type="button"
        >
          {isSubmitting ? "SUBMITTING..." : "SUBMIT"}
        </Button>
      </div>
    </div>
  );
}
