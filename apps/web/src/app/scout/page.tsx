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
import type { ChangeEvent } from "react";
import { useState } from "react";
import type { DefaultValues } from "react-hook-form";
import { useForm } from "react-hook-form";
import type { ZodTypeAny } from "zod";
import { getConfig } from "@/lib/spreadsheet";
import type { FormSchema } from "@/schema/scouting";
import { formSchema, metaSchema } from "@/schema/scouting";
import { IntegerInput } from "~/form/input";
import { SpreadsheetConfig } from "~/form/spreadsheet";
import { submitForm } from "./actions";

const TAGS = ["penalties", "defense"];

const getInitialFormValues = (): DefaultValues<FormSchema> => ({
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

const INITIAL_FORM_VALUES = getInitialFormValues();

type FieldName =
  | "meta.teamNumber"
  | "meta.qualification"
  | "meta.teamName"
  | "meta.allianceColour"
  | "autonomousMissed"
  | "autonomousMade"
  | "teleopMissed"
  | "teleopMade"
  | "tags";

type FieldComponent = "input" | "select" | "integer" | "tags";

type BaseField = {
  component: FieldComponent;
  name: FieldName;
  label: string;
  optional?: boolean;
  schema: ZodTypeAny;
};

type InputField = BaseField & {
  component: "input";
  inputType?: "number" | "text";
  inputMode?: InputModeValue;
  placeholder?: string;
  emptyValue?: number | undefined;
  clearEmptyString?: boolean;
};

type SelectField = BaseField & {
  component: "select";
  options: string[];
};

type IntegerField = BaseField & {
  component: "integer";
  incrementKey?: string;
};

type TagField = BaseField & {
  component: "tags";
};

type FieldDefinition = InputField | SelectField | IntegerField | TagField;

type FieldGroup = {
  id: string;
  className?: string;
  fields: FieldDefinition[];
};

type InputModeValue =
  | "none"
  | "text"
  | "decimal"
  | "numeric"
  | "tel"
  | "search"
  | "email"
  | "url";

function coerceNumberValue(
  rawValue: string,
  emptyValue?: number
): number | undefined {
  if (rawValue === "") {
    return emptyValue;
  }

  const parsed = Number.parseInt(rawValue, 10);
  return Number.isNaN(parsed) ? emptyValue : parsed;
}

const FIELD_GROUPS: FieldGroup[] = [
  {
    id: "meta",
    className: "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4",
    fields: [
      {
        component: "input",
        name: "meta.teamNumber",
        label: "Team Number",
        schema: metaSchema.shape.teamNumber,
        inputType: "number",
        inputMode: "numeric",
        placeholder: "Enter Team Number",
      },
      {
        component: "input",
        name: "meta.qualification",
        label: "Qualification Number",
        schema: metaSchema.shape.qualification,
        inputType: "number",
        inputMode: "numeric",
        placeholder: "Enter Qualification Number",
      },
      {
        component: "input",
        name: "meta.teamName",
        label: "Team Name",
        schema: metaSchema.shape.teamName,
        placeholder: "Enter Team Name",
        clearEmptyString: true,
        optional: true,
      },
      {
        component: "select",
        name: "meta.allianceColour",
        label: "Alliance Colour",
        schema: metaSchema.shape.allianceColour,
        options: ["Blue", "Red"],
        optional: true,
      },
    ],
  },
  {
    id: "stats",
    className: "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4",
    fields: [
      {
        component: "integer",
        name: "autonomousMissed",
        label: "Autonomous Missed",
        schema: formSchema.shape.autonomousMissed,
        incrementKey: "q",
      },
      {
        component: "integer",
        name: "autonomousMade",
        label: "Autonomous Made",
        schema: formSchema.shape.autonomousMade,
        incrementKey: "w",
      },
      {
        component: "integer",
        name: "teleopMissed",
        label: "Teleop Missed",
        schema: formSchema.shape.teleopMissed,
        incrementKey: "e",
      },
      {
        component: "integer",
        name: "teleopMade",
        label: "Teleop Made",
        schema: formSchema.shape.teleopMade,
        incrementKey: "r",
      },
    ],
  },
  {
    id: "tags",
    className: "grid grid-cols-1",
    fields: [
      {
        component: "tags",
        name: "tags",
        label: "Tags",
        schema: formSchema.shape.tags,
      },
    ],
  },
];

export default function Scout() {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: INITIAL_FORM_VALUES,
  });

  function createTag(inputValue: string): string {
    return inputValue.trim().toLowerCase();
  }

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

  function renderInputField(field: InputField) {
    const optionalLabel = field.optional ? (
      <span className="text-muted-foreground tracking-wide">(Optional)</span>
    ) : null;

    return (
      <FormField
        control={form.control}
        key={field.name}
        name={field.name}
        render={({ field: formField }) => {
          const currentValue = (formField.value ?? "") as string | number;

          const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
            if (field.inputType === "number") {
              formField.onChange(
                coerceNumberValue(event.target.value, field.emptyValue)
              );
              return;
            }

            const nextValue =
              event.target.value === "" && field.clearEmptyString
                ? undefined
                : event.target.value;
            formField.onChange(nextValue);
          };

          return (
            <FormItem>
              <FormLabel>
                {field.label}
                {optionalLabel}
              </FormLabel>
              <FormControl>
                <Input
                  {...formField}
                  inputMode={field.inputMode}
                  onChange={handleChange}
                  placeholder={field.placeholder}
                  type={field.inputType ?? "text"}
                  value={currentValue}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          );
        }}
      />
    );
  }

  function renderSelectField(field: SelectField) {
    const optionalLabel = field.optional ? (
      <span className="text-muted-foreground tracking-wide">(Optional)</span>
    ) : null;

    return (
      <FormField
        control={form.control}
        key={field.name}
        name={field.name}
        render={({ field: selectField }) => (
          <FormItem>
            <FormLabel>
              {field.label}
              {optionalLabel}
            </FormLabel>
            <FormControl>
              <Select
                onValueChange={(value) => selectField.onChange(value)}
                value={selectField.value as string | undefined}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={`Select ${field.label}`} />
                </SelectTrigger>
                <SelectContent>
                  {field.options.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  function renderIntegerField(field: IntegerField) {
    return (
      <IntegerInput
        incrementKey={field.incrementKey}
        key={field.name}
        label={field.label}
        name={field.name}
      />
    );
  }

  function renderTagsField(field: TagField) {
    return (
      <FormField
        control={form.control}
        key={field.name}
        name={field.name}
        render={() => (
          <FormItem>
            <FormLabel>{field.label}</FormLabel>
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
    );
  }

  function renderField(field: FieldDefinition) {
    if (field.component === "input") {
      return renderInputField(field);
    }

    if (field.component === "select") {
      return renderSelectField(field);
    }

    if (field.component === "integer") {
      return renderIntegerField(field);
    }

    if (field.component === "tags") {
      return renderTagsField(field);
    }

    return null;
  }

  return (
    <div className="container mx-auto max-w-6xl py-15">
      <Form {...form}>
        <form
          className="space-y-6 px-10"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          {FIELD_GROUPS.map((group) => (
            <div className={group.className} key={group.id}>
              {group.fields.map(renderField)}
            </div>
          ))}

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
