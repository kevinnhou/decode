import type { Doc } from "@decode/backend/convex/_generated/dataModel";
import { cn } from "@decode/ui/lib/utils";

type Duty = Doc<"scoutingDuties">;

export function formatDutyLabel(duty: Duty): string {
  if (duty.delegationType === "team" && duty.teamNumber !== undefined) {
    return `Team ${duty.teamNumber}`;
  }
  if (
    duty.delegationType === "position" &&
    duty.allianceColour !== undefined &&
    duty.alliancePosition !== undefined
  ) {
    return `${duty.allianceColour} ${duty.alliancePosition}`;
  }
  return "Unknown";
}

export function dutyChipClass(duty: Duty): string {
  const isRed =
    duty.delegationType === "position" && duty.allianceColour === "Red";
  const isBlue =
    duty.delegationType === "position" && duty.allianceColour === "Blue";
  const base =
    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium text-xs transition-all";
  const activeClass = duty.isActive ? "" : "opacity-50";
  const colourClass = isRed
    ? "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400"
    : isBlue
      ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-400"
      : "border-border bg-secondary/60 text-secondary-foreground";
  return cn(base, activeClass, colourClass);
}
