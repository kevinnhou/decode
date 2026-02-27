import type { DefaultValues } from "@decode/ui/lib/react-hook-form";
import type { ChangeEvent } from "react";
import type { ControllerRenderProps, FieldValues, Path } from "react-hook-form";
import type {
  FieldSchema,
  FormSchema,
  FrcMatchSubmissionSchema,
} from "@/schema/scouting";
import { INITIAL_PERIOD_DATA } from "./constants";

export function handleNumberInputChange<T extends FieldValues>(
  e: ChangeEvent<HTMLInputElement>,
  field: ControllerRenderProps<T, Path<T>>
) {
  const value = e.target.value;
  field.onChange(value === "" ? undefined : Number(value));
}

export function getNumberInputValue(value: number | null | undefined): string {
  return value === undefined || value === null ? "" : String(value);
}

export function formatNumberFieldProps<T extends FieldValues>(
  field: ControllerRenderProps<T, Path<T>>
) {
  return {
    ...field,
    onChange: (e: ChangeEvent<HTMLInputElement>) =>
      handleNumberInputChange(e, field),
    value: getNumberInputValue(field.value as number | null | undefined),
  };
}

export function getInitialFrcFormValues(): DefaultValues<FrcMatchSubmissionSchema> {
  return {
    meta: {
      teamNumber: undefined,
      matchNumber: undefined,
      matchStage: "qual",
      allianceColour: "Red",
      teamName: undefined,
    },
    inputMode: "form",
    periodData: INITIAL_PERIOD_DATA,
    climbLevel: 0,
    climbDuration: 0,
    notes: "",
  };
}

export function getInitialFormValues(): DefaultValues<FormSchema> {
  return {
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
  };
}

export function coerceNumberValue(
  rawValue: string,
  emptyValue?: number
): number | undefined {
  if (rawValue === "") {
    return emptyValue;
  }

  const parsed = Number.parseInt(rawValue, 10);
  return Number.isNaN(parsed) ? emptyValue : parsed;
}

export function createTag(inputValue: string): string {
  return inputValue.trim().toLowerCase();
}

export function aggregateFieldEvents(events: FieldSchema): {
  autonomousMade: number;
  autonomousMissed: number;
  teleopMade: number;
  teleopMissed: number;
} {
  const eventToKeyMap: Record<
    string,
    keyof ReturnType<typeof aggregateFieldEvents>
  > = {
    autonomous_made: "autonomousMade",
    autonomous_missed: "autonomousMissed",
    teleop_made: "teleopMade",
    teleop_missed: "teleopMissed",
  };

  return events.reduce(
    (acc, event) => {
      const key = eventToKeyMap[event.event];
      if (key) {
        acc[key] += event.count;
      }
      return acc;
    },
    {
      autonomousMade: 0,
      autonomousMissed: 0,
      teleopMade: 0,
      teleopMissed: 0,
    }
  );
}
