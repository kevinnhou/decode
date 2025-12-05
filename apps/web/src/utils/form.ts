import type { DefaultValues } from "react-hook-form";
import type { FormSchema, FieldSchema } from "@/schema/scouting";

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
  const eventToKeyMap: Record<string, keyof ReturnType<typeof aggregateFieldEvents>> = {
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
