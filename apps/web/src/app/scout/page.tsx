"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@repo/ui/shadcn/button";
import { Form } from "@repo/ui/shadcn/form";
import { useCallback, useEffect, useState } from "react";
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
import { toast } from "sonner";
import { EVENT_TO_FORM_KEY } from "~/form/field-input";

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
        config.sheetId,
      );

      if (result.success) {
        toast.success(result.message);
        form.reset(getInitialFormValues());
        setSelectedTags([]);
        setFieldEvents([]);
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
  }

  const handleRemoveEvent = useCallback(
    (index: number) => {
      const eventToRemove = fieldEvents[index];
      const newEvents = fieldEvents.filter((_, i) => i !== index);
      setFieldEvents(newEvents);

      const formKey = EVENT_TO_FORM_KEY[eventToRemove.event];
      if (formKey) {
        const currentValue = (form.getValues(formKey) as number) ?? 0;
        form.setValue(formKey, Math.max(0, currentValue - eventToRemove.count), {
          shouldValidate: true,
        });
      }
    },
    [fieldEvents, form],
  );

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
  }, [fieldEvents, handleRemoveEvent]);

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
