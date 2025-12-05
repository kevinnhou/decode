"use client";

import {
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
import { useFormContext } from "react-hook-form";
import type {
  FieldDefinition,
  InputField,
  IntegerField,
  SelectField,
  TagField,
} from "@/lib/form";
import { FIELD_GROUPS, TAGS } from "@/lib/form";
import { coerceNumberValue, createTag } from "@/utils/form";
import { IntegerInput } from "~/form/input";

interface FormFieldsProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  groups?: string[];
}

export function FormFields({
  selectedTags,
  onTagsChange,
  groups,
}: FormFieldsProps) {
  const form = useFormContext();

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

          function handleChange(event: ChangeEvent<HTMLInputElement>) {
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
          }

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
                  onTagsChange(tags);
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

  const visibleGroups = groups ?? FIELD_GROUPS.map((group) => group.id);

  return (
    <>
      {FIELD_GROUPS.filter((group) => visibleGroups.includes(group.id)).map(
        (group) => (
          <div className={group.className} key={group.id}>
            {group.fields.map(renderField)}
          </div>
        ),
      )}
    </>
  );
}
