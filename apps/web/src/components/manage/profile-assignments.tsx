"use client";

import type { Doc } from "@decode/backend/convex/_generated/dataModel";
import { Label } from "@decode/ui/components/label";
import { Separator } from "@decode/ui/components/separator";
import { cn } from "@decode/ui/lib/utils";
import { useMyDuties } from "@/hooks/use-my-duties";
import { getConfig } from "@/lib/config";

type Duty = Doc<"scoutingDuties">;

function formatDutyLabel(duty: Duty): string {
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
  return "Assignment";
}

function dutyChipClass(duty: Duty): string {
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

export function ProfileAssignments() {
  const config = getConfig();
  const { duties, isLoading } = useMyDuties();
  const eventCode = config?.eventCode?.trim() ?? null;

  const hasAssignments = eventCode && !isLoading && (duties?.length ?? 0) > 0;
  const dutiesList = duties ?? [];

  if (!hasAssignments) {
    return null;
  }

  return (
    <>
      <Separator />
      <div className="space-y-4">
        <div>
          <Label className="text-muted-foreground">Assignments</Label>
          <p className="mt-0.5 text-muted-foreground text-xs">
            Your scouting assignments for{" "}
            <span className="font-bold italic">{eventCode}</span>.
          </p>
        </div>
        <ul className="space-y-2">
          {dutiesList.map((duty) => (
            <li
              className="flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3"
              key={duty._id}
            >
              <span className={dutyChipClass(duty)}>
                {formatDutyLabel(duty)}
              </span>
              {duty.isActive ? (
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 font-medium text-emerald-700 text-xs dark:text-emerald-400">
                  Active
                </span>
              ) : (
                <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-xs">
                  Paused
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
