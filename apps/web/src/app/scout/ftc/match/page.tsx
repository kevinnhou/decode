/** biome-ignore-all lint/complexity/noVoid: PASS */
/** biome-ignore-all lint/nursery/noLeakedRender: PASS */

"use client";

import { Button } from "@decode/ui/components/button";
import {
  Form,
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
import { toast } from "@decode/ui/components/sonner";
import { Textarea } from "@decode/ui/components/textarea";
import { useForm } from "@decode/ui/lib/react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { memo, useCallback, useEffect, useState } from "react";
import { useInput } from "@/hooks/use-input";
import { useMyDuties } from "@/hooks/use-my-duties";
import { useShortcuts } from "@/hooks/use-shortcuts";
import { useTeamsMap } from "@/hooks/use-teams-map";
import { getFtcPeriodProgress, useMatchTimerFTC } from "@/hooks/use-timer";
import { getConfig } from "@/lib/config";
import {
  ALLIANCE_COLOUR_OPTIONS,
  MATCH_STAGE_OPTIONS,
} from "@/lib/form/constants";
import { formatShortcutKey } from "@/lib/form/shortcuts";
import type { PageState } from "@/lib/form/types";
import { aggregateFieldEvents, formatNumberFieldProps } from "@/lib/form/utils";
import type {
  FieldSchema,
  FtcMatchSubmissionSchema,
  FtcPeriodData,
} from "@/schema/scouting";
import { ftcMatchSubmissionSchema } from "@/schema/scouting";
import { EventsList } from "~/form/events-list";
import { FieldInput } from "~/form/field-input";
import { MatchTimerFTC } from "~/form/match-timer";
import { TeamCombobox } from "~/form/team-combobox";
import { AssignmentSidebar } from "~/sidebar/assignment-sidebar";
import {
  setSidebarAssignmentContent,
  setSidebarContent,
  setSidebarFooterContent,
} from "~/sidebar/slot";
import { submitMatch } from "./actions";

const INITIAL_FTC_PERIOD_DATA: {
  auto: FtcPeriodData["auto"];
  teleop: FtcPeriodData["teleop"];
} = {
  auto: { made: 0, missed: 0 },
  teleop: { made: 0, missed: 0 },
};

// biome-ignore lint/nursery/noShadow: PASS
const PeriodBar = memo(function PeriodBar({
  elapsedInPeriod,
  periodDuration,
}: {
  elapsedInPeriod: number;
  periodDuration: number;
}) {
  const pct =
    periodDuration > 0
      ? Math.max(0, (1 - elapsedInPeriod / periodDuration) * 100)
      : 0;
  return (
    <div
      className="h-full rounded-full bg-primary transition-[width] duration-1000 ease-linear"
      style={{ width: `${pct}%` }}
    />
  );
});

function getInitialFtcFormValues(): Partial<FtcMatchSubmissionSchema> {
  return {
    meta: {
      teamNumber: undefined as unknown as number,
      matchNumber: undefined as unknown as number,
      matchStage: "qual",
      allianceColour: "Red",
      teamName: undefined,
    },
    inputMode: "form",
    notes: "",
  };
}

export default function MatchScouting() {
  const { mode: inputMode } = useInput();
  const [pageState, setPageState] = useState<PageState>("meta");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [periodData, setPeriodData] = useState({ ...INITIAL_FTC_PERIOD_DATA });
  const [fieldEvents, setFieldEvents] = useState<FieldSchema>([]);
  const teamsMap = useTeamsMap();
  const [activeDuty, setActiveDuty] = useState<{
    delegationType: "team" | "position";
    teamNumber?: number;
    allianceColour?: "Red" | "Blue";
    alliancePosition?: number;
  } | null>(null);
  const [displayedDutyIndex, setDisplayedDutyIndex] = useState(0);

  const { duties } = useMyDuties();
  const timer = useMatchTimerFTC();
  const { shortcuts } = useShortcuts();

  const form = useForm<FtcMatchSubmissionSchema>({
    resolver: zodResolver(ftcMatchSubmissionSchema),
    defaultValues: getInitialFtcFormValues(),
  });

  const currentPeriod = timer.getCurrentPeriod();
  const isTransition = currentPeriod === "TRANSITION";
  const isAutoOrTransition = currentPeriod === "AUTO" || isTransition;

  const handleToggleAssignment = useCallback(() => {
    if (!duties || duties.length === 0) {
      return;
    }
    const idx = displayedDutyIndex % duties.length;
    const displayedDuty = duties[idx];

    if (activeDuty !== null) {
      setActiveDuty(null);
      form.reset(getInitialFtcFormValues());
      setDisplayedDutyIndex((i) => (i + 1) % duties.length);
    } else {
      setActiveDuty(displayedDuty);
      const base = getInitialFtcFormValues();
      if (
        displayedDuty.delegationType === "team" &&
        displayedDuty.teamNumber !== undefined
      ) {
        form.reset({
          ...base,
          meta: {
            ...(base.meta as FtcMatchSubmissionSchema["meta"]),
            teamNumber: displayedDuty.teamNumber,
            teamName: teamsMap[String(displayedDuty.teamNumber)] ?? undefined,
          },
        });
      } else if (
        displayedDuty.delegationType === "position" &&
        displayedDuty.allianceColour !== undefined
      ) {
        form.reset({
          ...base,
          meta: {
            ...(base.meta as FtcMatchSubmissionSchema["meta"]),
            allianceColour: displayedDuty.allianceColour,
          },
        });
      }
    }
  }, [duties, activeDuty, displayedDutyIndex, form, teamsMap]);

  const handleStartMatch = useCallback(() => {
    form.trigger("meta").then((valid) => {
      if (valid) {
        timer.start();
        setPageState("running");
      } else {
        toast.error("Please fill in all required match info.");
      }
    });
  }, [form, timer]);

  const handleRemoveEvent = useCallback((index: number) => {
    setFieldEvents((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const incrementMade = useCallback(() => {
    if (isTransition) {
      return;
    }
    const key = isAutoOrTransition ? "auto" : "teleop";
    setPeriodData((prev) => ({
      ...prev,
      [key]: { ...prev[key], made: prev[key].made + 1 },
    }));
  }, [isTransition, isAutoOrTransition]);

  const decrementMade = useCallback(() => {
    if (isTransition) {
      return;
    }
    const key = isAutoOrTransition ? "auto" : "teleop";
    setPeriodData((prev) => ({
      ...prev,
      [key]: { ...prev[key], made: Math.max(0, prev[key].made - 1) },
    }));
  }, [isTransition, isAutoOrTransition]);

  const incrementMissed = useCallback(() => {
    if (isTransition) {
      return;
    }
    const key = isAutoOrTransition ? "auto" : "teleop";
    setPeriodData((prev) => ({
      ...prev,
      [key]: { ...prev[key], missed: prev[key].missed + 1 },
    }));
  }, [isTransition, isAutoOrTransition]);

  const decrementMissed = useCallback(() => {
    if (isTransition) {
      return;
    }
    const key = isAutoOrTransition ? "auto" : "teleop";
    setPeriodData((prev) => ({
      ...prev,
      [key]: { ...prev[key], missed: Math.max(0, prev[key].missed - 1) },
    }));
  }, [isTransition, isAutoOrTransition]);

  const toggleMatchTimer = useCallback(() => {
    if (timer.state === "running") {
      timer.pause();
    } else if (timer.state === "paused") {
      timer.resume();
    }
  }, [timer]);

  // Keyboard shortcuts for FTC form mode
  useEffect(() => {
    if (pageState !== "running" || inputMode !== "form") {
      return;
    }

    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Keyboard shortcut handler
    function handleKeyDown(e: KeyboardEvent) {
      const active = document.activeElement;
      if (
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }
      const key = e.key === " " ? " " : e.key.toLowerCase();
      if (key === shortcuts.ftcMade) {
        e.preventDefault();
        incrementMade();
      } else if (key === shortcuts.ftcMadeDecrement) {
        e.preventDefault();
        decrementMade();
      } else if (key === shortcuts.ftcMissed) {
        e.preventDefault();
        incrementMissed();
      } else if (key === shortcuts.ftcMissedDecrement) {
        e.preventDefault();
        decrementMissed();
      } else if (key === shortcuts.matchTimer) {
        e.preventDefault();
        toggleMatchTimer();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    pageState,
    inputMode,
    shortcuts,
    incrementMade,
    decrementMade,
    incrementMissed,
    decrementMissed,
    toggleMatchTimer,
  ]);

  const onSubmit = useCallback(async () => {
    const config = getConfig();
    if (!config?.eventCode) {
      toast.error("Event code is required. Please configure in settings.");
      return;
    }

    const meta = form.getValues("meta");
    const notes = form.getValues("notes");

    let ftcPeriodData: FtcPeriodData;
    if (inputMode === "field") {
      const agg = aggregateFieldEvents(fieldEvents);
      ftcPeriodData = {
        auto: { made: agg.autonomousMade, missed: agg.autonomousMissed },
        teleop: { made: agg.teleopMade, missed: agg.teleopMissed },
      };
    } else {
      ftcPeriodData = periodData;
    }

    const payload: FtcMatchSubmissionSchema = {
      meta,
      inputMode,
      periodData: ftcPeriodData,
      ftcFieldEvents: inputMode === "field" ? fieldEvents : undefined,
      notes: notes ?? "",
    };

    const valid = ftcMatchSubmissionSchema.safeParse(payload);
    if (!valid.success) {
      toast.error("Validation failed. Please check your data.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitMatch(payload, config.eventCode);

      if (result.success) {
        toast.success(result.message);
        form.reset(getInitialFtcFormValues());
        setPeriodData({ ...INITIAL_FTC_PERIOD_DATA });
        setFieldEvents([]);
        timer.reset();
        setPageState("meta");
      } else {
        toast.error(result.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [form, inputMode, fieldEvents, periodData, timer]);

  const onReset = useCallback(() => {
    form.reset(getInitialFtcFormValues());
    setPeriodData({ ...INITIAL_FTC_PERIOD_DATA });
    setFieldEvents([]);
    timer.reset();
    setPageState("meta");
  }, [form, timer]);

  useEffect(() => {
    if (timer.state === "finished" && pageState === "running") {
      setPageState("summary");
    }
  }, [timer.state, pageState]);

  useEffect(() => {
    setSidebarFooterContent(
      <MatchTimerFTC
        formatTime={timer.formatTime}
        getCurrentPeriod={timer.getCurrentPeriod}
        pause={timer.pause}
        reset={timer.reset}
        resume={timer.resume}
        start={timer.start}
        state={timer.state}
        timeRemaining={timer.timeRemaining}
      />
    );

    return () => {
      setSidebarFooterContent(null);
    };
  }, [
    timer.formatTime,
    timer.getCurrentPeriod,
    timer.pause,
    timer.reset,
    timer.resume,
    timer.start,
    timer.state,
    timer.timeRemaining,
  ]);

  useEffect(() => {
    const showAssignmentPanel =
      duties &&
      duties.length > 0 &&
      (pageState === "meta" ||
        pageState === "running" ||
        pageState === "summary");
    if (showAssignmentPanel && duties.length > 0) {
      const displayedDuty = activeDuty
        ? (duties.find(
            (d) =>
              d.delegationType === activeDuty.delegationType &&
              (activeDuty.delegationType === "team"
                ? d.teamNumber === activeDuty.teamNumber
                : d.allianceColour === activeDuty.allianceColour &&
                  d.alliancePosition === activeDuty.alliancePosition)
          ) ?? duties[0])
        : duties[displayedDutyIndex % duties.length];
      setSidebarAssignmentContent(
        <AssignmentSidebar
          duty={displayedDuty}
          isFollowing={activeDuty !== null}
          onToggle={handleToggleAssignment}
        />
      );
    } else {
      setSidebarAssignmentContent(null);
    }
    return () => {
      setSidebarAssignmentContent(null);
    };
  }, [
    pageState,
    duties,
    activeDuty,
    displayedDutyIndex,
    handleToggleAssignment,
  ]);

  useEffect(() => {
    if (inputMode === "field" && pageState === "running") {
      setSidebarContent(
        <div className="flex h-full max-h-[calc(100svh-var(--header-height))] flex-col overflow-hidden p-4">
          <EventsList events={fieldEvents} onRemoveEvent={handleRemoveEvent} />
        </div>
      );
    } else {
      setSidebarContent(null);
    }

    return () => {
      setSidebarContent(null);
    };
  }, [inputMode, pageState, fieldEvents, handleRemoveEvent]);

  const watchedTeamNumber = form.watch("meta.teamNumber");

  useEffect(() => {
    if (!watchedTeamNumber) {
      return;
    }
    const mappedName = teamsMap[String(watchedTeamNumber)];
    if (!mappedName) {
      return;
    }
    form.setValue("meta.teamName", mappedName, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }, [form, teamsMap, watchedTeamNumber]);

  if (pageState === "meta") {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        <Form {...form}>
          <form className="space-y-6">
            <section className="space-y-4">
              <h2 className="font-semibold text-lg">Metadata</h2>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="meta.teamNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Team Number</FormLabel>
                      <FormControl>
                        <TeamCombobox
                          disabled={activeDuty?.delegationType === "team"}
                          onChange={(num, name) => {
                            field.onChange(num);
                            form.setValue("meta.teamName", name, {
                              shouldDirty: true,
                              shouldValidate: true,
                            });
                          }}
                          teamsMap={teamsMap}
                          value={field.value || undefined}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="meta.matchNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Match Number</FormLabel>
                      <FormControl>
                        <Input
                          inputMode="numeric"
                          placeholder="Enter match number"
                          type="number"
                          {...formatNumberFieldProps(field)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="meta.matchStage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Match Stage</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select stage" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {MATCH_STAGE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
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
                  name="meta.allianceColour"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alliance Colour</FormLabel>
                      <Select
                        disabled={activeDuty?.delegationType === "position"}
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select alliance" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ALLIANCE_COLOUR_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
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
                  name="meta.teamName"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>
                        Team Name{" "}
                        <span className="font-normal text-muted-foreground italic">
                          (optional)
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter team name"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>

            <Button
              className="w-full rounded-xl font-mono"
              onClick={handleStartMatch}
              type="button"
            >
              Start Match
            </Button>
          </form>
        </Form>
      </div>
    );
  }

  if (pageState === "running") {
    const progress = getFtcPeriodProgress(timer.elapsedTime);

    if (inputMode === "field") {
      return (
        <div className="container mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
          <Form {...form}>
            <div className="space-y-4">
              <PeriodProgress
                formatTime={timer.formatTime}
                progress={progress}
              />
              <FieldInput
                events={fieldEvents}
                form={form as never}
                getCurrentPeriod={timer.getCurrentPeriod}
                getEventTimestamp={timer.getEventTimestamp}
                onEventsChange={setFieldEvents}
                timerState={timer.state}
              />
            </div>
          </Form>
        </div>
      );
    }

    const activeKey = isAutoOrTransition ? "auto" : "teleop";

    return (
      <div className="container mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="space-y-6">
          <PeriodProgress formatTime={timer.formatTime} progress={progress} />

          {isTransition ? (
            <div className="rounded-xl border border-dashed px-6 py-10 text-center">
              <p className="font-mono text-muted-foreground text-sm uppercase tracking-widest">
                Transition
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <CounterCard
                  color="primary"
                  decrementKey={formatShortcutKey(shortcuts.ftcMadeDecrement)}
                  incrementKey={formatShortcutKey(shortcuts.ftcMade)}
                  label="Made"
                  onDecrement={decrementMade}
                  onIncrement={incrementMade}
                  value={periodData[activeKey].made}
                />
                <CounterCard
                  color="destructive"
                  decrementKey={formatShortcutKey(shortcuts.ftcMissedDecrement)}
                  incrementKey={formatShortcutKey(shortcuts.ftcMissed)}
                  label="Missed"
                  onDecrement={decrementMissed}
                  onIncrement={incrementMissed}
                  value={periodData[activeKey].missed}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const summaryPeriodData =
    inputMode === "field"
      ? (() => {
          const agg = aggregateFieldEvents(fieldEvents);
          return {
            auto: { made: agg.autonomousMade, missed: agg.autonomousMissed },
            teleop: { made: agg.teleopMade, missed: agg.teleopMissed },
          };
        })()
      : periodData;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <Form {...form}>
        <div className="space-y-6">
          <div className="space-y-1">
            <h2 className="font-semibold text-lg">Summary</h2>
            <p className="text-muted-foreground text-sm">
              Review your data then submit.
            </p>
          </div>

          <SummaryStats periodData={summaryPeriodData} />

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea
                    className="resize-none"
                    placeholder="Add any notes..."
                    rows={3}
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <Button
              className="rounded-xl font-mono sm:w-auto"
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
      </Form>
    </div>
  );
}

function PeriodProgress({
  progress,
  formatTime,
}: {
  progress: {
    period: string;
    elapsedInPeriod: number;
    periodDuration: number;
    timeRemainingInPeriod: number;
  };
  formatTime: (s: number) => string;
}) {
  return (
    <div className="space-y-2">
      <p className="font-mono text-muted-foreground text-xs uppercase tracking-wider">
        {progress.period} · {formatTime(progress.timeRemainingInPeriod)} left
      </p>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <PeriodBar
          elapsedInPeriod={progress.elapsedInPeriod}
          periodDuration={progress.periodDuration}
        />
      </div>
    </div>
  );
}

function CounterCard({
  label,
  value,
  color,
  incrementKey,
  decrementKey,
  onIncrement,
  onDecrement,
}: {
  label: string;
  value: number;
  color: "primary" | "destructive";
  incrementKey: string;
  decrementKey: string;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  const border =
    color === "primary"
      ? "border-primary/20 hover:border-primary/40"
      : "border-destructive/20 hover:border-destructive/40";
  const bg =
    color === "primary"
      ? "bg-primary/5 hover:bg-primary/10"
      : "bg-destructive/5 hover:bg-destructive/10";
  const actionBg =
    color === "primary"
      ? "hover:bg-primary/10 text-primary/70"
      : "hover:bg-destructive/10 text-destructive/70";
  const divider = color === "primary" ? "bg-primary/10" : "bg-destructive/10";

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-xl border-2 transition-colors ${border}`}
    >
      <button
        className={`flex flex-col items-center justify-center gap-0.5 py-6 transition-colors active:scale-[0.97] ${bg}`}
        onClick={onIncrement}
        type="button"
      >
        <span className="font-bold font-mono text-5xl tabular-nums leading-none">
          {value}
        </span>
        <span className="mt-1.5 font-mono text-muted-foreground text-xs uppercase tracking-widest">
          {label}
        </span>
      </button>
      <div className={`h-px ${divider}`} />
      <div className="grid grid-cols-2">
        <button
          className={`flex items-center justify-center gap-1.5 py-2.5 transition-colors ${actionBg}`}
          onClick={onDecrement}
          type="button"
        >
          <span className="font-mono text-base leading-none">−</span>
          <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground leading-none">
            {decrementKey}
          </kbd>
        </button>
        <button
          className={`flex items-center justify-center gap-1.5 py-2.5 transition-colors ${actionBg}`}
          onClick={onIncrement}
          type="button"
        >
          <span className="font-mono text-base leading-none">+</span>
          <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground leading-none">
            {incrementKey}
          </kbd>
        </button>
      </div>
    </div>
  );
}

function SummaryStats({
  periodData,
}: {
  periodData: { auto: FtcPeriodData["auto"]; teleop: FtcPeriodData["teleop"] };
}) {
  const totalMade = periodData.auto.made + periodData.teleop.made;
  const totalMissed = periodData.auto.missed + periodData.teleop.missed;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1 rounded-xl border bg-muted/30 p-4">
          <p className="font-mono text-muted-foreground text-xs uppercase tracking-widest">
            Auto
          </p>
          <div className="mt-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Made</span>
              <span className="font-mono font-semibold tabular-nums">
                {periodData.auto.made}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Missed</span>
              <span className="font-mono font-semibold tabular-nums">
                {periodData.auto.missed}
              </span>
            </div>
          </div>
        </div>
        <div className="space-y-1 rounded-xl border bg-muted/30 p-4">
          <p className="font-mono text-muted-foreground text-xs uppercase tracking-widest">
            Teleop
          </p>
          <div className="mt-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Made</span>
              <span className="font-mono font-semibold tabular-nums">
                {periodData.teleop.made}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Missed</span>
              <span className="font-mono font-semibold tabular-nums">
                {periodData.teleop.missed}
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between rounded-xl border bg-muted/50 px-4 py-3">
        <span className="text-muted-foreground text-sm">Total</span>
        <div className="flex gap-4">
          <span className="text-sm">
            <span className="font-bold font-mono tabular-nums">
              {totalMade}
            </span>{" "}
            <span className="text-muted-foreground text-xs">made</span>
          </span>
          <span className="text-sm">
            <span className="font-bold font-mono tabular-nums">
              {totalMissed}
            </span>{" "}
            <span className="text-muted-foreground text-xs">missed</span>
          </span>
        </div>
      </div>
    </div>
  );
}
