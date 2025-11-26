"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@repo/ui/shadcn/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@repo/ui/shadcn/form";
import { Input } from "@repo/ui/shadcn/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/shadcn/select";
import { TagSelector } from "@repo/ui/shadcn/tag-selector";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { getConfig } from "@/lib/spreadsheet";
import { type FormSchema, formSchema } from "@/schema/scouting";
import { IntegerInput } from "~/form/input";
import { SpreadsheetConfig } from "~/form/spreadsheet";
import { submitForm } from "./actions";

const TAGS = ["penalties", "defense"];

export default function Scout() {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      meta: {
        teamNumber: undefined,
        qualification: undefined,
        teamName: undefined,
        allianceColour: undefined,
      },
      autonomousMissed: 0,
      autonomousMade: 0,
      teleopMissed: 0,
      teleopMade: 0,
      tags: [],
    },
  });

  const createTag = (inputValue: string): string => {
    return inputValue.trim().toLowerCase();
  };

  const onSubmit = async (data: FormSchema) => {
    setIsSubmitting(true);
    try {
      const formData = {
        ...data,
        tags: selectedTags,
      };
      const config = getConfig();
      await submitForm(formData, config?.spreadsheetId, config?.sheetId);
      form.reset();
      setSelectedTags([]);
    } finally {
      setIsSubmitting(false);
    }
  };

  function onReset(): void {
    form.reset({
      meta: {
        teamNumber: undefined,
        qualification: undefined,
        teamName: undefined,
        allianceColour: undefined,
      },
      autonomousMissed: 0,
      autonomousMade: 0,
      teleopMissed: 0,
      teleopMade: 0,
      tags: [],
    });
    setSelectedTags([]);
  }

  return (
    <div className="container mx-auto max-w-6xl py-15">
      <Form {...form}>
        <form
          className="space-y-6 px-10"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FormField
              control={form.control}
              name="meta.teamNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Team Number</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      inputMode="numeric"
                      onChange={(e) => {
                        const val =
                          e.target.value === ""
                            ? undefined
                            : Number.parseInt(e.target.value, 10);
                        field.onChange(Number.isNaN(val) ? undefined : val);
                      }}
                      placeholder="Enter Team Number"
                      type="number"
                      value={field.value ?? ""}
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
                      {...field}
                      inputMode="numeric"
                      onChange={(e) => {
                        const val =
                          e.target.value === ""
                            ? undefined
                            : Number.parseInt(e.target.value, 10);
                        field.onChange(Number.isNaN(val) ? undefined : val);
                      }}
                      placeholder="Enter Qualification Number"
                      type="number"
                      value={field.value ?? ""}
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
                      {...field}
                      onChange={(e) => {
                        field.onChange(e.target.value || undefined);
                      }}
                      placeholder="Enter Team Name"
                      type="text"
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
                  <FormControl>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                      }}
                      value={field.value}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Alliance Colour" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Blue">Blue</SelectItem>
                        <SelectItem value="Red">Red</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <IntegerInput
              incrementKey="q"
              label="Autonomous Missed"
              name="autonomousMissed"
            />
            <IntegerInput
              incrementKey="w"
              label="Autonomous Made"
              name="autonomousMade"
            />
            <IntegerInput
              incrementKey="e"
              label="Teleop Missed"
              name="teleopMissed"
            />
            <IntegerInput
              incrementKey="r"
              label="Teleop Made"
              name="teleopMade"
            />
          </div>

          <FormField
            control={form.control}
            name="tags"
            render={() => (
              <FormItem>
                <FormLabel>Tags</FormLabel>
                <FormControl>
                  <TagSelector
                    availableTags={TAGS}
                    createTag={createTag}
                    onChange={(tags) => {
                      setSelectedTags(tags);
                      form.setValue("tags", tags);
                    }}
                    selectedTags={selectedTags}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
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
