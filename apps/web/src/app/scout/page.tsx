"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@repo/ui/shadcn/button";
import { Form } from "@repo/ui/shadcn/form";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { FormFields } from "@/components/form/render";
import { getConfig } from "@/lib/spreadsheet";
import type { FormSchema } from "@/schema/scouting";
import { formSchema } from "@/schema/scouting";
import { getInitialFormValues } from "@/utils/form";
import { SpreadsheetConfig } from "~/form/spreadsheet";
import { submitForm } from "./actions";

export default function Scout() {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: getInitialFormValues(),
  });

  async function onSubmit(data: FormSchema) {
    setIsSubmitting(true);
    try {
      const formData = {
        ...data,
        tags: selectedTags,
      };
      const config = getConfig();
      await submitForm(formData, config?.spreadsheetId, config?.sheetId);
      form.reset(getInitialFormValues());
      setSelectedTags([]);
    } finally {
      setIsSubmitting(false);
    }
  }

  function onReset(): void {
    form.reset(getInitialFormValues());
    setSelectedTags([]);
  }

  return (
    <div className="container mx-auto max-w-6xl py-15">
      <Form {...form}>
        <form
          className="space-y-6 px-10"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <FormFields
            onTagsChange={setSelectedTags}
            selectedTags={selectedTags}
          />

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
