"use client";

import { Label } from "@decode/ui/components/label";
import { Separator } from "@decode/ui/components/separator";
import { useMyDuties } from "@/hooks/use-my-duties";
import { getConfig } from "@/lib/config";
import { dutyChipClass, formatDutyLabel } from "@/lib/duties";

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
