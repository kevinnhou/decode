"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@repo/ui/shadcn/button";
import { Form } from "@repo/ui/shadcn/form";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { FormFields } from "~/form/render";
import { FieldInput } from "~/form/field-input";
import { FieldEventsList } from "~/form/events-list";
import { useInputMode } from "@/hooks/use-input-mode";
import { getConfig } from "@/lib/spreadsheet";
import type { FieldSchema } from "@/schema/scouting";
import type { FormSchema } from "@/schema/scouting";
import { formSchema } from "@/schema/scouting";
import { getInitialFormValues } from "@/utils/form";
import { SpreadsheetConfig } from "~/form/spreadsheet";
import { setSidebarContent } from "~/sidebar/slot";
import { submitUnified } from "./actions";

export default function Scout() {
  const { mode } = useInputMode();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldEvents, setFieldEvents] = useState<FieldSchema>([]);

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: getInitialFormValues(),
  });

  async function onSubmit(data: FormSchema) {
    const config = getConfig();
    if (!config?.spreadsheetId || !config?.sheetId) {
      return;
    }

    setIsSubmitting(true);
    try {
      await submitUnified(
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
        config.sheetId,
      );


      form.reset(getInitialFormValues());
      setSelectedTags([]);
      setFieldEvents([]);
    } finally {
      setIsSubmitting(false);
    }
  }

  function onReset(): void {
    form.reset(getInitialFormValues());
    setSelectedTags([]);
    setFieldEvents([]);
  }

  function handleRemoveEvent(index: number) {
    const eventToRemove = fieldEvents[index];
    const newEvents = fieldEvents.filter((_, i) => i !== index);
    setFieldEvents(newEvents);

    const EVENT_TO_FORM_KEY: Record<string, "autonomousMade" | "autonomousMissed" | "teleopMade" | "teleopMissed"> = {
      autonomous_made: "autonomousMade",
      autonomous_missed: "autonomousMissed",
      teleop_made: "teleopMade",
      teleop_missed: "teleopMissed",
    };

    const formKey = EVENT_TO_FORM_KEY[eventToRemove.event];
    if (formKey) {
      const currentValue = (form.getValues(formKey) as number) ?? 0;
      form.setValue(formKey, Math.max(0, currentValue - eventToRemove.count), {
        shouldValidate: true,
      });
    }
  };

  function handleClearEvents  () {
    const EVENT_TO_FORM_KEY: Record<string, "autonomousMade" | "autonomousMissed" | "teleopMade" | "teleopMissed"> = {
      autonomous_made: "autonomousMade",
      autonomous_missed: "autonomousMissed",
      teleop_made: "teleopMade",
      teleop_missed: "teleopMissed",
    };

    const totals = fieldEvents.reduce(
      (acc, event) => {
        const formKey = EVENT_TO_FORM_KEY[event.event];
        if (formKey) {
          acc[formKey] = (acc[formKey] ?? 0) + event.count;
        }
        return acc;
      },
      {} as Partial<Record<"autonomousMade" | "autonomousMissed" | "teleopMade" | "teleopMissed", number>>
    );

    for (const [formKey, count] of Object.entries(totals)) {
      const key = formKey as "autonomousMade" | "autonomousMissed" | "teleopMade" | "teleopMissed";
      const currentValue = (form.getValues(key) as number) ?? 0;
      form.setValue(key, Math.max(0, currentValue - count), {
        shouldValidate: true,
      });
    }

    setFieldEvents([]);
  };

  useEffect(() => {
    setSidebarContent(
      <FieldEventsList
        events={fieldEvents}
        onRemoveEvent={handleRemoveEvent}
      />
    );

    return () => {
      setSidebarContent(null);
    };
  }, [fieldEvents, handleRemoveEvent, handleClearEvents]);

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
            />
          ) : (
            <FormFields
              groups={["stats", "tags"]}
              onTagsChange={setSelectedTags}
              selectedTags={selectedTags}
            />
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <div className="flex gap-3">
              <Button
                className="rounded-xl font-mono"
                disabled={isSubmitting}
                onClick={onReset}
                type="button"
                variant="destructive"
              >
                Reset
              </Button>
              <SpreadsheetConfig />
            </div>
            <Button
              className="w-full rounded-xl font-mono sm:w-auto"
              disabled={
                isSubmitting
              }
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
