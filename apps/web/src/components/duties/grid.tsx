"use client";

import { cn } from "@decode/ui/lib/utils";
import type { Duty } from "@/lib/form/duties";

type DutiesGridProps = {
  duties: Duty[];
  scoutNames: Map<string, string>;
  onPositionClick?: (alliance: "Red" | "Blue", position: number) => void;
};

function findDutiesForPosition(
  duties: Duty[],
  alliance: "Red" | "Blue",
  position: number
): Duty[] {
  return duties
    .filter(
      (d) =>
        d.delegationType === "position" &&
        d.allianceColour === alliance &&
        d.alliancePosition === position &&
        d.deletedAt === undefined
    )
    .sort((a, b) => Number(b.isActive) - Number(a.isActive));
}

type PositionCellProps = {
  alliance: "Red" | "Blue";
  position: number;
  slotDuties: Duty[];
  scoutNames: Map<string, string>;
  interactive: boolean;
  onPositionClick?: (alliance: "Red" | "Blue", position: number) => void;
};

function PositionCell({
  alliance,
  position,
  slotDuties,
  scoutNames,
  interactive,
  onPositionClick,
}: PositionCellProps) {
  const hasAssignees = slotDuties.length > 0;

  const inner = (
    <>
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
      <div className="mt-1 min-h-10 space-y-0.5">
        {slotDuties.length === 0 ? (
          <p className="truncate font-semibold text-foreground text-sm">—</p>
        ) : (
          slotDuties.map((duty) => {
            const name = scoutNames.get(duty.scout) ?? duty.scout.slice(0, 8);
            return (
              <p
                className={cn(
                  "truncate font-semibold text-foreground text-sm",
                  !duty.isActive && "text-muted-foreground line-through"
                )}
                key={duty._id}
                title={name}
              >
                {name}
              </p>
            );
          })
        )}
      </div>
    </>
  );

  const cellClass = cn(
    "rounded-lg border p-3 text-left transition-colors",
    alliance === "Red"
      ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20"
      : "border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20",
    !hasAssignees && "border-dashed opacity-70",
    interactive
      ? "cursor-pointer hover:ring-2 hover:ring-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      : undefined
  );

  if (interactive && onPositionClick) {
    return (
      <button
        className={cellClass}
        onClick={() => onPositionClick(alliance, position)}
        type="button"
      >
        {inner}
      </button>
    );
  }

  return <div className={cellClass}>{inner}</div>;
}

export function DutiesGrid({
  duties,
  scoutNames,
  onPositionClick,
}: DutiesGridProps) {
  const interactive = Boolean(onPositionClick);

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
              const slotDuties = findDutiesForPosition(
                duties,
                alliance,
                position
              );
              return (
                <PositionCell
                  alliance={alliance}
                  interactive={interactive}
                  key={`${alliance}-${position}`}
                  onPositionClick={onPositionClick}
                  position={position}
                  scoutNames={scoutNames}
                  slotDuties={slotDuties}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
