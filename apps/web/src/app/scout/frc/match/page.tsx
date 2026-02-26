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
import { useForm } from "@decode/ui/lib/react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useInputMode } from "@/hooks/use-input-mode";
import {
  useMatchTimerFRC,
  usePeriodActionTimer,
} from "@/hooks/use-match-timer";
import { getConfig, getTeamsMap, setTeamsMap } from "@/lib/config";
import type {
  FrcAutoPath,
  FrcFieldEvent,
  FrcMatchSubmissionSchema,
  FrcPeriodDataMap,
} from "@/schema/scouting";
import { frcMatchSubmissionSchema } from "@/schema/scouting";
import { getInitialFrcFormValues } from "@/utils/form";
import { Config } from "~/form/config";
import { FrcEventsList } from "~/form/events-list";
import { FrcFieldInput } from "~/form/field-input";
import { MatchTimerFRC } from "~/form/match-timer";
import { PeriodSlide } from "~/form/period-slide";
import { SummaryView } from "~/form/summary-view";
import { setSidebarContent } from "~/sidebar/slot";
import { submitMatch } from "./actions";

const INITIAL_PERIOD_DATA: FrcPeriodDataMap = {
  auto: { scoring: 0, feeding: 0, defense: 0 },
  transition: { scoring: 0, feeding: 0, defense: 0 },
  shift1: { scoring: 0, feeding: 0, defense: 0 },
  shift2: { scoring: 0, feeding: 0, defense: 0 },
  shift3: { scoring: 0, feeding: 0, defense: 0 },
  shift4: { scoring: 0, feeding: 0, defense: 0 },
  endGame: { scoring: 0, feeding: 0, defense: 0 },
};

type PageState = "meta" | "running" | "summary";

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
  const scoringTimer = usePeriodActionTimer(timer.getCurrentPeriod);
  const feedingTimer = usePeriodActionTimer(timer.getCurrentPeriod);
  const defenseTimer = usePeriodActionTimer(timer.getCurrentPeriod);

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

  useEffect(() => {
    if (timer.state === "finished" && pageState === "running") {
      setPageState("summary");
    }
  }, [timer.state, pageState]);

  useEffect(() => {
    setSidebarContent(
      <div className="flex h-full max-h-[calc(100svh-var(--header-height))] flex-col gap-4 overflow-hidden p-4">
        <div className="shrink-0">
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
        </div>
        {inputMode === "field" && pageState === "running" ? (
          <div className="min-h-0 flex-1">
            <FrcEventsList
              events={frcFieldEvents}
              onRemoveEvent={handleRemoveFrcEvent}
            />
          </div>
        ) : null}
      </div>
    );

    return () => {
      setSidebarContent(null);
    };
  }, [
    inputMode,
    pageState,
    frcFieldEvents,
    handleRemoveFrcEvent,
    timer.formatTime,
    timer.getCurrentPeriod,
    timer.pause,
    timer.reset,
    timer.resume,
    timer.start,
    timer.state,
    timer.timeRemaining,
  ]);

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
      <div className="container mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
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
                          {...field}
                          onChange={(e) => {
                            const v = e.target.value;
                            field.onChange(v === "" ? undefined : Number(v));
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
                          {...field}
                          onChange={(e) => {
                            const v = e.target.value;
                            field.onChange(v === "" ? undefined : Number(v));
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
                          <SelectItem value="practice">Practice</SelectItem>
                          <SelectItem value="qual">Qualification</SelectItem>
                          <SelectItem value="playoff">Playoff</SelectItem>
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
                          <SelectItem value="Red">Red</SelectItem>
                          <SelectItem value="Blue">Blue</SelectItem>
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
                      <FormLabel>Team Name (optional)</FormLabel>
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
      return (
        <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
          <Form {...form}>
            <div>
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

    return (
      <div className="container mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <Form {...form}>
          <div>
            <PeriodSlide
              defenseTimer={defenseTimer}
              feedingTimer={feedingTimer}
              form={form}
              onPeriodDataChange={setPeriodData}
              period={currentPeriod}
              scoringTimer={scoringTimer}
            />
          </div>
        </Form>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <Form {...form}>
        <div>
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
