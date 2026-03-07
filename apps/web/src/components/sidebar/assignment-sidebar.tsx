"use client";

import type { Doc } from "@decode/backend/convex/_generated/dataModel";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from "@decode/ui/components/sidebar";
import { cn } from "@decode/ui/lib/utils";

type Duty = Doc<"scoutingDuties">;

function formatBadgeLabel(duty: Duty): string {
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

function badgeClass(duty: Duty): string {
  const isRed =
    duty.delegationType === "position" && duty.allianceColour === "Red";
  const isBlue =
    duty.delegationType === "position" && duty.allianceColour === "Blue";
  return isRed
    ? "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400"
    : isBlue
      ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-400"
      : "border-border bg-secondary/60 text-secondary-foreground";
}

type AssignmentSidebarProps = {
  duty: Duty;
  isFollowing: boolean;
  onToggle: () => void;
};

export function AssignmentSidebar({
  duty,
  isFollowing,
  onToggle,
}: AssignmentSidebarProps) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel className="px-2 py-1.5 text-[10px] uppercase tracking-wider">
        Assignments
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <button
          className="flex w-full items-center justify-between rounded-lg px-2.5 text-left"
          onClick={onToggle}
          type="button"
        >
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 font-medium text-xs",
              badgeClass(duty)
            )}
          >
            {formatBadgeLabel(duty)}
          </span>
          {isFollowing ? (
            <span className="text-muted-foreground text-xs italic">ACTIVE</span>
          ) : null}
        </button>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
