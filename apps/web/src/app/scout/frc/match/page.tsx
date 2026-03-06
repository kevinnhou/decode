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
import { useForm } from "@decode/ui/lib/react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { memo, useCallback, useEffect, useState } from "react";
import { useInputMode } from "@/hooks/use-input-mode";
import {
  type FrcPeriod,
  getFrcPeriodProgress,
  useMatchTimerFRC,
  usePeriodActionTimer,
} from "@/hooks/use-match-timer";
import { useScoutingShortcuts } from "@/hooks/use-scouting-shortcuts";
import { getConfig, getTeamsMap, setTeamsMap } from "@/lib/config";
import {
  ALLIANCE_COLOUR_OPTIONS,
  FRC_PERIOD_TO_KEY,
  INITIAL_PERIOD_DATA,
  MATCH_STAGE_OPTIONS,
} from "@/lib/form/constants";
import type { PageState } from "@/lib/form/types";
import {
  formatNumberFieldProps,
  getInitialFrcFormValues,
} from "@/lib/form/utils";
import type {
  FrcAutoPath,
  FrcFieldEvent,
  FrcMatchSubmissionSchema,
  FrcPeriodDataMap,
} from "@/schema/scouting";
import { frcMatchSubmissionSchema } from "@/schema/scouting";
import { Config } from "~/form/config";
import { FrcEventsList } from "~/form/events-list";
import { FrcFieldInput } from "~/form/field-input";
import { MatchTimerFRC } from "~/form/match-timer";
import { PeriodSlide } from "~/form/period-slide";
import { SummaryView } from "~/form/summary-view";
import { setSidebarContent, setSidebarFooterContent } from "~/sidebar/slot";
import { submitMatch } from "./actions";

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

export default function MatchScouting() {
  const { mode: inputMode } = useInputMode();
  const [pageState, setPageState] = useState<PageState>("meta");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [periodData, setPeriodData] =
    useState<FrcPeriodDataMap>(INITIAL_PERIOD_DATA);
  const [frcFieldEvents, setFrcFieldEvents] = useState<FrcFieldEvent[]>([]);
  const [autoPath, setAutoPath] = useState<FrcAutoPath>([]);
  const [teamsMap, setTeamsMapState] = useState<Record<string, string>>(() =>
    getTeamsMap()
  );

  const timer = useMatchTimerFRC();
  const scoringTimer = usePeriodActionTimer();
  const feedingTimer = usePeriodActionTimer();
  const defenseTimer = usePeriodActionTimer();

  const form = useForm<FrcMatchSubmissionSchema>({
    resolver: zodResolver(frcMatchSubmissionSchema),
    defaultValues: getInitialFrcFormValues(),
  });

  const handleStartMatch = useCallback(() => {
    if (!form.trigger) {
      return;
    }
    form.trigger("meta").then((valid) => {
      if (valid) {
        timer.start();
        setPageState("running");
      } else {
        toast.error("Please fill in all required match info.");
      }
    });
  }, [form, timer]);

  const onSubmit = useCallback(async () => {
    const config = getConfig();
    if (!config?.eventCode) {
      toast.error("Event code is required. Please configure in settings.");
      return;
    }

    const meta = form.getValues("meta");
    const climbLevel = form.getValues("climbLevel");
    const climbDuration = form.getValues("climbDuration");
    const notes = form.getValues("notes");

    const payload: FrcMatchSubmissionSchema = {
      meta,
      inputMode,
      periodData: inputMode === "form" ? periodData : undefined,
      frcFieldEvents: inputMode === "field" ? frcFieldEvents : undefined,
      autoPath: inputMode === "field" ? autoPath : undefined,
      climbLevel,
      climbDuration,
      notes: notes ?? "",
    };

    const valid = frcMatchSubmissionSchema.safeParse(payload);
    if (!valid.success) {
      toast.error("Validation failed. Please check your data.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitMatch(
        payload,
        config.eventCode,
        config.spreadsheetId,
        config.sheetId
      );

      if (result.success) {
        toast.success(result.message);
        form.reset(getInitialFrcFormValues());
        setPeriodData(INITIAL_PERIOD_DATA);
        setFrcFieldEvents([]);
        setAutoPath([]);
        scoringTimer.reset();
        feedingTimer.reset();
        defenseTimer.reset();
        timer.reset();
        setPageState("meta");
      } else {
        toast.error(result.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [
    form,
    inputMode,
    periodData,
    frcFieldEvents,
    autoPath,
    timer,
    scoringTimer,
    feedingTimer,
    defenseTimer,
  ]);

  const onReset = useCallback(() => {
    form.reset(getInitialFrcFormValues());
    setPeriodData(INITIAL_PERIOD_DATA);
    setFrcFieldEvents([]);
    setAutoPath([]);
    scoringTimer.reset();
    feedingTimer.reset();
    defenseTimer.reset();
    timer.reset();
    setPageState("meta");
  }, [form, timer, scoringTimer, feedingTimer, defenseTimer]);

  const handleRemoveFrcEvent = useCallback((index: number) => {
    setFrcFieldEvents((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleTeamMapLoad = useCallback((map: Record<string, string>) => {
    setTeamsMapState((prev) => ({ ...prev, ...map }));
  }, []);

  useEffect(() => {
    setTeamsMap(teamsMap);
  }, [teamsMap]);

  const { tick: scoringTick } = scoringTimer;
  const { tick: feedingTick } = feedingTimer;
  const { tick: defenseTick } = defenseTimer;

  useEffect(() => {
    scoringTick(timer.elapsedTime);
    feedingTick(timer.elapsedTime);
    defenseTick(timer.elapsedTime);
  }, [timer.elapsedTime, scoringTick, feedingTick, defenseTick]);

  const { shortcuts } = useScoutingShortcuts();

  const handleTimerStop = useCallback(
    (
      flushFn: () => { period: FrcPeriod; duration: number }[],
      action: "scoring" | "feeding" | "defense"
    ) => {
      const segments = flushFn();
      if (segments.length === 0) {
        return;
      }
      setPeriodData((prev) => {
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
    []
  );

  const toggleScoringTimer = useCallback(() => {
    if (scoringTimer.isRunning) {
      handleTimerStop(scoringTimer.flush, "scoring");
    } else {
      scoringTimer.start();
    }
  }, [scoringTimer, handleTimerStop]);

  const toggleFeedingTimer = useCallback(() => {
    if (feedingTimer.isRunning) {
      handleTimerStop(feedingTimer.flush, "feeding");
    } else {
      feedingTimer.start();
    }
  }, [feedingTimer, handleTimerStop]);

  const toggleDefenseTimer = useCallback(() => {
    if (defenseTimer.isRunning) {
      handleTimerStop(defenseTimer.flush, "defense");
    } else {
      defenseTimer.start();
    }
  }, [defenseTimer, handleTimerStop]);

  const toggleMatchTimer = useCallback(() => {
    if (timer.state === "running") {
      timer.pause();
    } else if (timer.state === "paused") {
      timer.resume();
    }
  }, [timer]);

  const handleShortcutKey = useCallback(
    (key: string): boolean => {
      const keyMap: Record<string, (() => void) | undefined> = {
        [shortcuts.scoring]: toggleScoringTimer,
        [shortcuts.feeding]: toggleFeedingTimer,
        [shortcuts.defense]: toggleDefenseTimer,
        [shortcuts.matchTimer]: toggleMatchTimer,
      };
      const action = keyMap[key];
      if (action) {
        action();
        return true;
      }
      return false;
    },
    [
      shortcuts,
      toggleScoringTimer,
      toggleFeedingTimer,
      toggleDefenseTimer,
      toggleMatchTimer,
    ]
  );

  useEffect(() => {
    if (pageState !== "running" || inputMode !== "form") {
      return;
    }

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
      if (handleShortcutKey(key)) {
        e.preventDefault();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [pageState, inputMode, handleShortcutKey]);

  const flushActiveTimers = useCallback(() => {
    const scoringSegments = scoringTimer.isRunning ? scoringTimer.flush() : [];
    const feedingSegments = feedingTimer.isRunning ? feedingTimer.flush() : [];
    const defenseSegments = defenseTimer.isRunning ? defenseTimer.flush() : [];

    if (
      scoringSegments.length > 0 ||
      feedingSegments.length > 0 ||
      defenseSegments.length > 0
    ) {
      setPeriodData((prev) => {
        const updated = { ...prev };

        for (const segment of scoringSegments) {
          const key = FRC_PERIOD_TO_KEY[segment.period];
          updated[key] = {
            ...updated[key],
            scoring: updated[key].scoring + segment.duration,
          };
        }

        for (const segment of feedingSegments) {
          const key = FRC_PERIOD_TO_KEY[segment.period];
          updated[key] = {
            ...updated[key],
            feeding: updated[key].feeding + segment.duration,
          };
        }

        for (const segment of defenseSegments) {
          const key = FRC_PERIOD_TO_KEY[segment.period];
          updated[key] = {
            ...updated[key],
            defense: updated[key].defense + segment.duration,
          };
        }

        return updated;
      });
    }
  }, [scoringTimer, feedingTimer, defenseTimer]);

  useEffect(() => {
    if (timer.state === "finished" && pageState === "running") {
      flushActiveTimers();
      setPageState("summary");
    }
  }, [timer.state, pageState, flushActiveTimers]);

  useEffect(() => {
    setSidebarFooterContent(
      <MatchTimerFRC
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
    if (inputMode === "field" && pageState === "running") {
      setSidebarContent(
        <div className="flex h-full max-h-[calc(100svh-var(--header-height))] flex-col overflow-hidden p-4">
          <FrcEventsList
            events={frcFieldEvents}
            onRemoveEvent={handleRemoveFrcEvent}
          />
        </div>
      );
    } else {
      setSidebarContent(null);
    }

    return () => {
      setSidebarContent(null);
    };
  }, [inputMode, pageState, frcFieldEvents, handleRemoveFrcEvent]);

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
                        <Input
                          inputMode="numeric"
                          placeholder="Enter team number"
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
                        <div className="flex justify-between gap-1 font-bold">
                          [
                          <span className="font-extralight font-sans italic">
                            optional
                          </span>
                          ]
                        </div>
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

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Config
                loadedCount={Object.keys(teamsMap).length}
                onTeamMapLoad={handleTeamMapLoad}
              />
              <Button
                className="w-full rounded-xl font-mono sm:w-auto"
                onClick={handleStartMatch}
                type="button"
              >
                Start Match
              </Button>
            </div>
          </form>
        </Form>
      </div>
    );
  }

  if (pageState === "running") {
    const currentPeriod = timer.getCurrentPeriod();

    if (inputMode === "field") {
      const progress = getFrcPeriodProgress(timer.elapsedTime);

      return (
        <div className="container mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
          <Form {...form}>
            <div className="space-y-6">
              <div className="space-y-2">
                <p className="font-mono text-muted-foreground text-xs uppercase tracking-wider">
                  {progress.period} ·{" "}
                  {timer.formatTime(progress.timeRemainingInPeriod)} left
                </p>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <PeriodBar
                    elapsedInPeriod={progress.elapsedInPeriod}
                    periodDuration={progress.periodDuration}
                  />
                </div>
              </div>
              <FrcFieldInput
                autoPath={autoPath}
                fieldEvents={frcFieldEvents}
                getCurrentPeriod={timer.getCurrentPeriod}
                getEventTimestamp={timer.getEventTimestamp}
                onAutoPathChange={setAutoPath}
                onFieldEventsChange={setFrcFieldEvents}
                timerState={timer.state}
              />
            </div>
          </Form>
        </div>
      );
    }

    const progress = getFrcPeriodProgress(timer.elapsedTime);

    return (
      <div className="container mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        <Form {...form}>
          <div className="space-y-6">
            <div className="space-y-2">
              <p className="font-mono text-muted-foreground text-xs uppercase tracking-wider">
                {progress.period} ·{" "}
                {timer.formatTime(progress.timeRemainingInPeriod)} left
              </p>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <PeriodBar
                  elapsedInPeriod={progress.elapsedInPeriod}
                  periodDuration={progress.periodDuration}
                />
              </div>
            </div>
            <PeriodSlide
              defenseTimer={defenseTimer}
              feedingTimer={feedingTimer}
              form={form}
              onPeriodDataChange={setPeriodData}
              period={currentPeriod}
              scoringTimer={scoringTimer}
              shortcuts={shortcuts}
            />
          </div>
        </Form>
      </div>
    );
  }

  const progress = getFrcPeriodProgress(timer.elapsedTime);

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <Form {...form}>
        <div className="space-y-6">
          <div className="space-y-2">
            <p className="font-mono text-muted-foreground text-xs uppercase tracking-wider">
              {progress.period} ·{" "}
              {timer.formatTime(progress.timeRemainingInPeriod)} left
            </p>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <PeriodBar
                elapsedInPeriod={progress.elapsedInPeriod}
                periodDuration={progress.periodDuration}
              />
            </div>
          </div>
          <SummaryView
            autoPath={inputMode === "field" ? autoPath : undefined}
            form={form}
            frcFieldEvents={inputMode === "field" ? frcFieldEvents : undefined}
            isSubmitting={isSubmitting}
            onReset={onReset}
            onSubmit={onSubmit}
            periodData={inputMode === "form" ? periodData : undefined}
          />
        </div>
      </Form>
    </div>
  );
}
