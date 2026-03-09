/** biome-ignore-all lint/complexity/noVoid: PASS */

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
import { useCallback, useEffect, useState } from "react";
import { useInput } from "@/hooks/use-input";
import { useTeamsMap } from "@/hooks/use-teams-map";
import { useMatchTimer } from "@/hooks/use-timer";
import { getConfig } from "@/lib/config";
import { formatNumberFieldProps, getInitialFormValues } from "@/lib/form/utils";
import type { FieldSchema, FormSchema } from "@/schema/scouting";
import { formSchema } from "@/schema/scouting";
import { EventsList } from "~/form/events-list";
import { EVENT_TO_FORM_KEY, FieldInput } from "~/form/field-input";
import { MatchTimer } from "~/form/match-timer";
import { FormFields } from "~/form/render";
import { TeamCombobox } from "~/form/team-combobox";
import { setSidebarContent, setSidebarFooterContent } from "~/sidebar/slot";
import { submitUnified } from "./actions";

export default function MatchScouting() {
  const { mode } = useInput();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldEvents, setFieldEvents] = useState<FieldSchema>([]);
  const teamsMap = useTeamsMap();
  const timer = useMatchTimer();

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: getInitialFormValues(),
  });

  async function onSubmit(data: FormSchema) {
    const config = getConfig();
    if (!config?.eventCode) {
      toast.error("Event code is required. Please configure in settings.");
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
        config.eventCode,
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
      setSidebarFooterContent(
        <MatchTimer
          formatTime={timer.formatTime}
          pause={timer.pause}
          reset={timer.reset}
          resume={timer.resume}
          start={timer.start}
          state={timer.state}
          timeRemaining={timer.timeRemaining}
        />
      );
      setSidebarContent(
        <div className="flex h-full max-h-[calc(100svh-var(--header-height))] flex-col overflow-hidden p-4">
          <EventsList events={fieldEvents} onRemoveEvent={handleRemoveEvent} />
        </div>
      );
    } else {
      setSidebarFooterContent(null);
      setSidebarContent(null);
    }

    return () => {
      setSidebarFooterContent(null);
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

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <Form {...form}>
        <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
          <section className="space-y-4">
            <h2 className="font-semibold text-lg">Metadata</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <FormField
                control={form.control}
                name="meta.teamNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Team Number</FormLabel>
                    <FormControl>
                      <TeamCombobox
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
                name="meta.qualification"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Qualification Number</FormLabel>
                    <FormControl>
                      <Input
                        inputMode="numeric"
                        placeholder="Enter Qualification Number"
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
                name="meta.teamName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Team Name{" "}
                      <span className="text-muted-foreground tracking-wide">
                        (Optional)
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter Team Name"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="meta.allianceColour"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Alliance Colour{" "}
                      <span className="text-muted-foreground tracking-wide">
                        (Optional)
                      </span>
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Alliance Colour" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Blue">Blue</SelectItem>
                        <SelectItem value="Red">Red</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </section>

          {mode === "field" ? (
            <FieldInput
              events={fieldEvents}
              form={form}
              getEventTimestamp={timer.getEventTimestamp}
              onEventsChange={setFieldEvents}
              timeRemaining={timer.timeRemaining}
              timerState={timer.state}
            />
          ) : (
            <FormFields
              form={form}
              groups={["stats", "tags"]}
              onTagsChange={setSelectedTags}
              selectedTags={selectedTags}
            />
          )}

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
