/** biome-ignore-all lint/complexity/noVoid: PASS */
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@repo/ui/shadcn/button";
import { Form } from "@repo/ui/shadcn/form";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useMatchTimer } from "@/hooks/use-match-timer";
import { useInputMode } from "@/hooks/use-input-mode";
import { getConfig, getTeamsMap, setTeamsMap } from "@/lib/config";
import type { FieldSchema, FormSchema } from "@/schema/scouting";
import { formSchema } from "@/schema/scouting";
import { getInitialFormValues } from "@/utils/form";
import { Config } from "~/form/config";
import { EventsList } from "~/form/events-list";
import { EVENT_TO_FORM_KEY, FieldInput } from "~/form/field-input";
import { MatchTimer } from "~/form/match-timer";
import { FormFields } from "~/form/render";
import { setSidebarContent } from "~/sidebar/slot";
import { submitUnified } from "./actions";

export default function Scout() {
  const { mode } = useInputMode();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldEvents, setFieldEvents] = useState<FieldSchema>([]);
  const [teamsMap, setTeamsMapState] = useState<Record<string, string>>(() =>
    getTeamsMap()
  );
  const timer = useMatchTimer();

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: getInitialFormValues(),
  });

  async function onSubmit(data: FormSchema) {
    const config = getConfig();
    if (!(config?.spreadsheetId && config?.sheetId)) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitUnified(
        {
          meta: data.meta,
          autonomousMade: data.autonomousMade,
          autonomousMissed: data.autonomousMissed,
          teleopMade: data.teleopMade,
          teleopMissed: data.teleopMissed,
          tags: selectedTags,
          fieldEvents: fieldEvents.length > 0 ? fieldEvents : undefined,
        },
        config.spreadsheetId,
        config.sheetId
      );

      if (result.success) {
        toast.success(result.message);
        form.reset(getInitialFormValues());
        setSelectedTags([]);
        setFieldEvents([]);
        timer.reset();
      } else {
        toast.error(result.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function onReset(): void {
    form.reset(getInitialFormValues());
    setSelectedTags([]);
    setFieldEvents([]);
    timer.reset();
  }

  const handleRemoveEvent = useCallback(
    (index: number) => {
      const eventToRemove = fieldEvents[index];
      const newEvents = fieldEvents.filter((_, i) => i !== index);
      setFieldEvents(newEvents);

      const formKey = EVENT_TO_FORM_KEY[eventToRemove.event];
      if (formKey) {
        const currentValue = (form.getValues(formKey) as number) ?? 0;
        form.setValue(
          formKey,
          Math.max(0, currentValue - eventToRemove.count),
          {
            shouldValidate: true,
          }
        );
      }
    },
    [fieldEvents, form]
  );

  useEffect(() => {
    if (mode === "field") {
      setSidebarContent(
        <div className="flex h-full max-h-[calc(100svh-var(--header-height))] flex-col gap-4 overflow-hidden p-4">
          <div className="shrink-0">
            <MatchTimer
              timeRemaining={timer.timeRemaining}
              state={timer.state}
              start={timer.start}
              pause={timer.pause}
              resume={timer.resume}
              reset={timer.reset}
              formatTime={timer.formatTime}
            />
          </div>
          <div className="min-h-0 flex-1">
            <EventsList events={fieldEvents} onRemoveEvent={handleRemoveEvent} />
          </div>
        </div>
      );
    } else {
      setSidebarContent(null);
    }

    return () => {
      setSidebarContent(null);
    };
  }, [
    fieldEvents,
    handleRemoveEvent,
    mode,
    timer.timeRemaining,
    timer.state,
    timer.start,
    timer.pause,
    timer.resume,
    timer.reset,
    timer.formatTime,
  ]);

  const watchedTeamNumber = form.watch("meta.teamNumber");

  const handleTeamMapLoad = useCallback((map: Record<string, string>) => {
    setTeamsMapState((prev) => ({ ...prev, ...map }));
  }, []);

  useEffect(() => {
    setTeamsMap(teamsMap);
  }, [teamsMap]);

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

  return (
    <div className="container mx-auto max-w-6xl py-15">
      <Form {...form}>
        <form
          className="space-y-6 px-10"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <FormFields
            groups={["meta"]}
            onTagsChange={setSelectedTags}
            selectedTags={selectedTags}
          />

          {mode === "field" ? (
            <FieldInput
              events={fieldEvents}
              form={form}
              onEventsChange={setFieldEvents}
              getEventTimestamp={timer.getEventTimestamp}
              timeRemaining={timer.timeRemaining}
              timerState={timer.state}
            />
          ) : (
            <FormFields
              groups={["stats", "tags"]}
              onTagsChange={setSelectedTags}
              selectedTags={selectedTags}
            />
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                className="rounded-xl font-mono"
                disabled={isSubmitting}
                onClick={onReset}
                type="button"
                variant="destructive"
              >
                Reset
              </Button>
              <Config
                loadedCount={Object.keys(teamsMap).length}
                onTeamMapLoad={handleTeamMapLoad}
              />
            </div>
            <Button
              className="w-full rounded-xl font-mono sm:w-auto"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "SUBMITTING..." : "SUBMIT"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
