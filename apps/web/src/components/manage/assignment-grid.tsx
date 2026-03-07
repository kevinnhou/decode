"use client";

import type { Doc } from "@decode/backend/convex/_generated/dataModel";
import { cn } from "@decode/ui/lib/utils";

type Duty = Doc<"scoutingDuties">;

type AssignmentGridProps = {
  duties: Duty[];
  scoutNames: Map<string, string>;
};

function findScoutForPosition(
  duties: Duty[],
  alliance: "Red" | "Blue",
  position: number
): Duty | undefined {
  return duties.find(
    (d) =>
      d.delegationType === "position" &&
      d.allianceColour === alliance &&
      d.alliancePosition === position &&
      d.isActive &&
      d.deletedAt === undefined
  );
}

export function AssignmentGrid({ duties, scoutNames }: AssignmentGridProps) {
  return (
    <div className="space-y-2">
      {(["Red", "Blue"] as const).map((alliance) => (
        <div className="space-y-1.5" key={alliance}>
          <p
            className={cn(
              "font-medium text-xs",
              alliance === "Red"
                ? "text-red-600 dark:text-red-400"
                : "text-blue-600 dark:text-blue-400"
            )}
          >
            {alliance} Alliance
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((position) => {
              const duty = findScoutForPosition(duties, alliance, position);
              const scoutName = duty
                ? (scoutNames.get(duty.scout) ?? "—")
                : null;
              return (
                <div
                  className={cn(
                    "rounded-lg border p-3 text-center transition-colors",
                    alliance === "Red"
                      ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20"
                      : "border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20",
                    !scoutName && "border-dashed opacity-60"
                  )}
                  key={`${alliance}-${position}`}
                >
                  <p
                    className={cn(
                      "font-medium text-xs",
                      alliance === "Red"
                        ? "text-red-500 dark:text-red-400"
                        : "text-blue-500 dark:text-blue-400"
                    )}
                  >
                    {alliance} {position}
                  </p>
                  <p className="mt-1 truncate font-semibold text-foreground text-sm">
                    {scoutName ?? "—"}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
