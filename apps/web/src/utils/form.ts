import type { DefaultValues } from "react-hook-form";
import type { FormSchema } from "@/schema/scouting";

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
