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
import { Textarea } from "@decode/ui/components/textarea";
import type { UseFormReturn } from "@decode/ui/lib/react-hook-form";
import { type Dispatch, type SetStateAction, useRef, useState } from "react";
import { FRC_CLIMB_LEVELS } from "@/lib/form/field-groups";
import type {
  FrcAutoPath,
  FrcFieldEvent,
  FrcMatchSubmissionSchema,
  FrcPeriodDataMap,
} from "@/schema/scouting";

const PERIOD_LABELS: Record<keyof FrcPeriodDataMap, string> = {
  auto: "AUTO",
  transition: "Downtime",
  shift1: "Shift 1",
  shift2: "Shift 2",
  shift3: "Shift 3",
  shift4: "Shift 4",
  endGame: "End Game",
};

const SUMMARY_PERIOD_KEYS = (
  Object.keys(PERIOD_LABELS) as (keyof FrcPeriodDataMap)[]
).filter((k) => k !== "transition");

type PeriodMetric = "scoring" | "feeding" | "defense";

function periodCellId(
  key: keyof FrcPeriodDataMap,
  metric: PeriodMetric
): string {
  return `${key}:${metric}`;
}

function formatSeconds(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function parseNonNegativeSeconds(raw: string): number {
  if (raw === "" || raw === ".") {
    return 0;
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) {
    return 0;
  }
  return n;
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
  onPeriodDataChange?: Dispatch<SetStateAction<FrcPeriodDataMap>>;
  frcFieldEvents?: FrcFieldEvent[];
  autoPath?: FrcAutoPath;
  form: UseFormReturn<FrcMatchSubmissionSchema>;
  isSubmitting: boolean;
  onSubmit: () => void;
  onReset: () => void;
}

export function SummaryView({
  periodData,
  onPeriodDataChange,
  frcFieldEvents,
  autoPath,
  form,
  isSubmitting,
  onSubmit,
  onReset,
}: SummaryViewProps) {
  const [editingCellId, setEditingCellId] = useState<string | null>(null);
  const [draftSeconds, setDraftSeconds] = useState("");
  const skipBlurCommitRef = useRef(false);

  function patchPeriod(
    key: keyof FrcPeriodDataMap,
    metric: "scoring" | "feeding" | "defense",
    raw: string
  ) {
    if (!onPeriodDataChange) {
      return;
    }
    const v = parseNonNegativeSeconds(raw);
    onPeriodDataChange((prev) => ({
      ...prev,
      [key]: { ...prev[key], [metric]: v },
    }));
  }

  function beginEdit(
    key: keyof FrcPeriodDataMap,
    metric: PeriodMetric,
    currentSeconds: number
  ) {
    skipBlurCommitRef.current = false;
    setEditingCellId(periodCellId(key, metric));
    setDraftSeconds(
      Number.isFinite(currentSeconds) ? String(currentSeconds) : "0"
    );
  }

  function commitEdit(key: keyof FrcPeriodDataMap, metric: PeriodMetric) {
    patchPeriod(key, metric, draftSeconds);
    setEditingCellId(null);
  }

  function cancelEdit() {
    skipBlurCommitRef.current = true;
    setEditingCellId(null);
  }

  return (
    <div className="space-y-6">
      {periodData !== undefined && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Period</th>
                <th className="px-2 py-3 text-right font-mono text-xs uppercase tracking-wide">
                  Scoring (s)
                </th>
                <th className="px-2 py-3 text-right font-mono text-xs uppercase tracking-wide">
                  Feeding (s)
                </th>
                <th className="px-2 py-3 text-right font-mono text-xs uppercase tracking-wide">
                  Defence (s)
                </th>
              </tr>
            </thead>
            <tbody>
              {SUMMARY_PERIOD_KEYS.map((key) => (
                <tr className="border-b last:border-0" key={key}>
                  <td className="px-4 py-2 font-medium">
                    {PERIOD_LABELS[key]}
                  </td>
                  {(["scoring", "feeding", "defense"] as const).map(
                    (metric) => {
                      const id = periodCellId(key, metric);
                      const isEditing =
                        onPeriodDataChange !== undefined &&
                        editingCellId === id;
                      const seconds = periodData[key][metric];

                      return (
                        <td className="px-2 py-1.5" key={metric}>
                          {onPeriodDataChange ? (
                            isEditing ? (
                              <Input
                                aria-label={`${PERIOD_LABELS[key]} ${metric} seconds`}
                                autoFocus
                                className="h-8 text-right font-mono text-sm tabular-nums"
                                inputMode="decimal"
                                min={0}
                                onBlur={() => {
                                  if (skipBlurCommitRef.current) {
                                    skipBlurCommitRef.current = false;
                                    return;
                                  }
                                  commitEdit(key, metric);
                                }}
                                onChange={(e) =>
                                  setDraftSeconds(e.target.value)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    e.currentTarget.blur();
                                  }
                                  if (e.key === "Escape") {
                                    e.preventDefault();
                                    cancelEdit();
                                  }
                                }}
                                step="any"
                                type="number"
                                value={draftSeconds}
                              />
                            ) : (
                              <button
                                className="w-full rounded-md px-2 py-1.5 text-right font-mono text-sm tabular-nums transition-colors hover:bg-muted/80"
                                onClick={() => beginEdit(key, metric, seconds)}
                                type="button"
                              >
                                {formatSeconds(seconds)}
                              </button>
                            )
                          ) : (
                            <div className="px-2 py-1 text-right font-mono tabular-nums">
                              {formatSeconds(seconds)}
                            </div>
                          )}
                        </td>
                      );
                    }
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {frcFieldEvents !== undefined && frcFieldEvents.length > 0 && (
        <div className="rounded-lg border p-4">
          <h3 className="mb-1 font-medium text-sm">Field Events</h3>
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
          <h3 className="mb-2 font-medium text-sm">AUTO path</h3>
          <p className="text-muted-foreground text-sm">
            {autoPath.length} point{autoPath.length !== 1 ? "s" : ""} recorded.
            Use Reset to clear and re-record if the path is wrong.
          </p>
        </div>
      )}

      <section className="space-y-4 border-t pt-6">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="climbLevel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Climb level</FormLabel>
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
                <FormLabel>Climb duration (seconds)</FormLabel>
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

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-muted-foreground">
                Notes <span className="font-normal italic">(optional)</span>
              </FormLabel>
              <FormControl>
                <Textarea
                  className="min-h-24 resize-none"
                  placeholder="Additional notes..."
                  rows={4}
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </section>

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
