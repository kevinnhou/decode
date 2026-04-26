/** biome-ignore-all lint/complexity/noExcessiveCognitiveComplexity: PASS */

"use client";

import { api } from "@decode/backend/convex/_generated/api";
import type { Id } from "@decode/backend/convex/_generated/dataModel";
import { Button } from "@decode/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@decode/ui/components/dialog";
import { Input } from "@decode/ui/components/input";
import { Label } from "@decode/ui/components/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@decode/ui/components/popover";
import { Skeleton } from "@decode/ui/components/skeleton";
import { toast } from "@decode/ui/components/sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@decode/ui/components/tooltip";
import { cn } from "@decode/ui/lib/utils";
import { useMutation, useQuery } from "convex/react";
import {
  Check,
  LayoutGrid,
  List as ListIcon,
  PauseCircle,
  PlayCircle,
  Trash2,
  UserRoundPlus,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { Duty } from "@/lib/form/duties";
import { dutyChipClass, formatDutyLabel } from "@/lib/form/duties";
import { DutiesGrid } from "~/duties/grid";

type CreateArgs = {
  scout: string;
  delegationType: "team" | "position";
  teamNumber?: string;
  allianceColour?: "Red" | "Blue";
  alliancePosition?: number;
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

type AssignmentChipProps = {
  duty: Duty;
  onToggleActive: (duty: Duty) => void;
  onDelete: (dutyId: Id<"scoutingDuties">) => void;
};

function AssignmentChip({
  duty,
  onToggleActive,
  onDelete,
}: AssignmentChipProps) {
  return (
    <div className={dutyChipClass(duty)}>
      <span>{formatDutyLabel(duty)}</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className="ml-0.5 rounded-full opacity-60 transition-opacity hover:opacity-100"
            onClick={() => onToggleActive(duty)}
            type="button"
          >
            {duty.isActive ? (
              <PauseCircle className="size-3.5" />
            ) : (
              <PlayCircle className="size-3.5" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent>{duty.isActive ? "Pause" : "Resume"}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className="rounded-full opacity-60 transition-all hover:text-destructive hover:opacity-100"
            onClick={() => onDelete(duty._id)}
            type="button"
          >
            <Trash2 className="size-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent>Remove</TooltipContent>
      </Tooltip>
    </div>
  );
}

type ScoutRowProps = {
  scout: { userId: string; displayName: string; role: string };
  duties: Duty[];
  onToggleActive: (duty: Duty) => void;
  onDelete: (dutyId: Id<"scoutingDuties">) => void;
  assignDisabled: boolean;
  assignDisabledReason?: string;
  onAssignPosition: (
    scoutId: string,
    alliance: "Red" | "Blue",
    position: number
  ) => Promise<void>;
  onAssignTeam: (scoutId: string, teamNumber: number) => Promise<void>;
};

function ScoutRow({
  scout,
  duties,
  onToggleActive,
  onDelete,
  assignDisabled,
  assignDisabledReason,
  onAssignPosition,
  onAssignTeam,
}: ScoutRowProps) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-start gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary text-xs">
          {getInitials(scout.displayName)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm leading-none">
              {scout.displayName}
            </p>
            <span className="rounded-full border px-1.5 py-0.5 text-muted-foreground text-xs capitalize">
              {scout.role === "leadScout" ? "Lead Scout" : scout.role}
            </span>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {duties.length === 0 ? (
              <p className="text-muted-foreground text-xs">No assignments</p>
            ) : (
              duties.map((duty) => (
                <AssignmentChip
                  duty={duty}
                  key={duty._id}
                  onDelete={onDelete}
                  onToggleActive={onToggleActive}
                />
              ))
            )}
          </div>
        </div>
        <QuickAssignPopover
          disabled={assignDisabled}
          disabledReason={assignDisabledReason}
          onAssignPosition={onAssignPosition}
          onAssignTeam={onAssignTeam}
          scout={scout}
        />
      </div>
    </div>
  );
}

type SlotTarget = { alliance: "Red" | "Blue"; position: number };

function PositionSlotDialog({
  slot,
  scouts,
  scoutNames,
  duties,
  onAdd,
  onRemove,
  onClose,
}: {
  slot: SlotTarget | null;
  scouts: Array<{ userId: string; displayName: string; role: string }>;
  scoutNames: Map<string, string>;
  duties: Duty[];
  onAdd: (args: CreateArgs, options?: { silent?: boolean }) => Promise<void>;
  onRemove: (dutyId: Id<"scoutingDuties">) => void | Promise<void>;
  onClose: () => void;
}) {
  const [selectedToAdd, setSelectedToAdd] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  useEffect(() => {
    if (slot) {
      setSelectedToAdd(new Set());
    }
  }, [slot]);

  const open = slot !== null;
  const alliance = slot?.alliance;
  const position = slot?.position;

  const dutiesOnSlot =
    alliance !== undefined && position !== undefined
      ? duties.filter(
          (d) =>
            d.delegationType === "position" &&
            d.allianceColour === alliance &&
            d.alliancePosition === position &&
            d.deletedAt === undefined
        )
      : [];

  const assignedIds = new Set(dutiesOnSlot.map((d) => d.scout));
  const availableScouts = scouts.filter((s) => !assignedIds.has(s.userId));

  function toggleSelected(scoutId: string) {
    setSelectedToAdd((prev) => {
      const next = new Set(prev);
      if (next.has(scoutId)) {
        next.delete(scoutId);
      } else {
        next.add(scoutId);
      }
      return next;
    });
  }

  async function handleBulkAdd() {
    if (!(alliance !== undefined && position !== undefined)) {
      return;
    }
    const ids = [...selectedToAdd];
    if (ids.length === 0) {
      return;
    }
    setBulkBusy(true);
    try {
      const results = await Promise.allSettled(
        ids.map((scoutId) =>
          onAdd(
            {
              scout: scoutId,
              delegationType: "position",
              allianceColour: alliance,
              alliancePosition: position,
            },
            { silent: true }
          )
        )
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      const ok = results.length - failed;
      if (ok > 0) {
        toast.success(
          ok === 1
            ? "1 scout assigned"
            : `${ok} scouts assigned to ${alliance} ${position}`
        );
      }
      if (failed > 0) {
        toast.error(
          failed === 1
            ? "One assignment could not be created"
            : `${failed} assignments could not be created`
        );
      }
      setSelectedToAdd(new Set());
      if (failed === 0) {
        onClose();
      }
    } finally {
      setBulkBusy(false);
    }
  }

  const label =
    alliance !== undefined && position !== undefined
      ? `${alliance} ${position}`
      : "Position";

  return (
    <Dialog
      onOpenChange={(next) => {
        if (!next) {
          onClose();
        }
      }}
      open={open}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          {/** biome-ignore lint/suspicious/noCommentText: PASS */}
          <DialogTitle>Assign // {label}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 py-1">
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs">
              Currently on this slot
            </Label>
            {dutiesOnSlot.length === 0 ? (
              <p className="text-muted-foreground text-sm">No one yet.</p>
            ) : (
              <ul className="space-y-2">
                {dutiesOnSlot.map((duty) => (
                  <li
                    className="flex min-h-12 items-center justify-between gap-3 rounded-lg border bg-muted/40 px-3 py-2"
                    key={duty._id}
                  >
                    <span className="min-w-0 truncate font-medium text-sm">
                      {scoutNames.get(duty.scout) ?? duty.scout}
                      {duty.isActive ? null : (
                        <span className="ml-1.5 text-muted-foreground text-xs">
                          (paused)
                        </span>
                      )}
                    </span>
                    <Button
                      className="size-10 shrink-0 touch-manipulation"
                      onClick={() => onRemove(duty._id)}
                      size="icon"
                      type="button"
                      variant="ghost"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs">
              Add scouts to {label}
            </Label>
            {availableScouts.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Everyone in your organisation is already on this slot.
              </p>
            ) : (
              <ul className="max-h-[min(50vh,20rem)] space-y-2 overflow-y-auto pr-1">
                {availableScouts.map((s) => {
                  const selected = selectedToAdd.has(s.userId);
                  return (
                    <li key={s.userId}>
                      <button
                        aria-pressed={selected}
                        className={cn(
                          "flex min-h-12 w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          selected
                            ? "border-primary bg-primary/10"
                            : "border-border bg-card hover:bg-muted/60 active:bg-muted/80"
                        )}
                        onClick={() => toggleSelected(s.userId)}
                        type="button"
                      >
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary text-xs">
                          {getInitials(s.displayName)}
                        </div>
                        <span className="min-w-0 flex-1 font-medium text-sm leading-snug">
                          {s.displayName}
                        </span>
                        <span
                          className={cn(
                            "flex size-8 shrink-0 items-center justify-center rounded-md border-2",
                            selected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-muted-foreground/30 bg-transparent"
                          )}
                        >
                          {selected ? (
                            <Check
                              aria-hidden
                              className="size-4"
                              strokeWidth={2.5}
                            />
                          ) : null}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            disabled={
              bulkBusy ||
              selectedToAdd.size === 0 ||
              availableScouts.length === 0
            }
            onClick={handleBulkAdd}
            type="button"
          >
            {bulkBusy
              ? "Assigning…"
              : selectedToAdd.size === 0
                ? "Assign selected"
                : `Assign ${selectedToAdd.size} scout${selectedToAdd.size === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type QuickAssignPopoverProps = {
  scout: { userId: string; displayName: string; role: string };
  disabled: boolean;
  disabledReason?: string;
  onAssignPosition: (
    scoutId: string,
    alliance: "Red" | "Blue",
    position: number
  ) => Promise<void>;
  onAssignTeam: (scoutId: string, teamNumber: number) => Promise<void>;
};

function QuickAssignPopover({
  scout,
  disabled,
  disabledReason,
  onAssignPosition,
  onAssignTeam,
}: QuickAssignPopoverProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"position" | "team">("position");
  const [teamInput, setTeamInput] = useState("");
  const [busy, setBusy] = useState(false);

  async function handlePositionTap(alliance: "Red" | "Blue", position: number) {
    setBusy(true);
    try {
      await onAssignPosition(scout.userId, alliance, position);
      setOpen(false);
    } catch {
      //
    } finally {
      setBusy(false);
    }
  }

  async function handleTeamSubmit() {
    const n = Number.parseInt(teamInput, 10);
    if (Number.isNaN(n) || n < 1) {
      toast.error("Enter a valid team number");
      return;
    }
    setBusy(true);
    try {
      await onAssignTeam(scout.userId, n);
      setOpen(false);
      setTeamInput("");
    } catch {
      //
    } finally {
      setBusy(false);
    }
  }

  const triggerButton = (
    <Button
      className="shrink-0 gap-1"
      disabled={disabled}
      size="sm"
      type="button"
      variant="outline"
    >
      <UserRoundPlus className="size-3.5" />
      Assign
    </Button>
  );

  return (
    <Popover onOpenChange={setOpen} open={Boolean(!disabled && open)}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">
            <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          {disabled
            ? (disabledReason ?? "Enter an event code to assign")
            : "Assign to a team or alliance slot"}
        </TooltipContent>
      </Tooltip>
      <PopoverContent align="end" className="w-72 p-3">
        <div className="space-y-3">
          <div className="flex gap-1 rounded-md border p-0.5">
            <Button
              className="h-7 flex-1 text-xs"
              onClick={() => setMode("position")}
              size="sm"
              type="button"
              variant={mode === "position" ? "secondary" : "ghost"}
            >
              Position
            </Button>
            <Button
              className="h-7 flex-1 text-xs"
              onClick={() => setMode("team")}
              size="sm"
              type="button"
              variant={mode === "team" ? "secondary" : "ghost"}
            >
              Team
            </Button>
          </div>
          {mode === "position" ? (
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-1.5">
                {(["Red", "Blue"] as const).flatMap((a) =>
                  [1, 2, 3].map((p) => (
                    <Button
                      className={
                        a === "Red"
                          ? "h-9 border-red-200 bg-red-50 text-red-800 text-xs hover:bg-red-100 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/60"
                          : "h-9 border-blue-200 bg-blue-50 text-blue-800 text-xs hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-950/60"
                      }
                      disabled={busy}
                      key={`${a}-${p}`}
                      onClick={() => handlePositionTap(a, p)}
                      type="button"
                      variant="outline"
                    >
                      {a[0]}
                      {p}
                    </Button>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                className="h-9"
                inputMode="numeric"
                onChange={(e) => setTeamInput(e.target.value)}
                placeholder="Team #"
                value={teamInput}
              />
              <Button
                disabled={busy}
                onClick={() => handleTeamSubmit()}
                size="sm"
                type="button"
              >
                Add
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

type MutationFn<T> = (args: T) => Promise<Id<"scoutingDuties">>;

async function createTeamDuty(
  mutate: MutationFn<{
    organisationId: Id<"organisations">;
    eventCode: string;
    scout: string;
    delegationType: "team";
    teamNumber: number;
  }>,
  organisationId: Id<"organisations">,
  eventCode: string,
  args: CreateArgs
): Promise<void> {
  const teamNum = Number.parseInt(args.teamNumber ?? "", 10);
  if (Number.isNaN(teamNum) || teamNum < 1) {
    toast.error("Enter a valid team number");
    return;
  }
  await mutate({
    organisationId,
    eventCode,
    scout: args.scout,
    delegationType: "team",
    teamNumber: teamNum,
  });
}

async function createPositionDuty(
  mutate: MutationFn<{
    organisationId: Id<"organisations">;
    eventCode: string;
    scout: string;
    delegationType: "position";
    allianceColour: "Red" | "Blue";
    alliancePosition: number;
  }>,
  organisationId: Id<"organisations">,
  eventCode: string,
  args: CreateArgs
): Promise<void> {
  if (!(args.allianceColour && args.alliancePosition)) {
    toast.error("Select alliance and position");
    return;
  }
  await mutate({
    organisationId,
    eventCode,
    scout: args.scout,
    delegationType: "position",
    allianceColour: args.allianceColour,
    alliancePosition: args.alliancePosition,
  });
}

export function DutiesManagement() {
  const [eventCode, setEventCode] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  const organisation = useQuery(api.auth.getOrganisation);
  const scouts = useQuery(api.duties.getScoutsForOrg);
  const duties = useQuery(
    api.duties.listDutiesForEvent,
    organisation && eventCode.trim()
      ? { organisationId: organisation._id, eventCode: eventCode.trim() }
      : "skip"
  );

  const createDuty = useMutation(api.duties.createDuty);
  const updateDuty = useMutation(api.duties.updateDuty);
  const deleteDuty = useMutation(api.duties.deleteDuty);

  const handleCreate = useCallback(
    async (args: CreateArgs, options?: { silent?: boolean }) => {
      if (!(organisation && eventCode.trim())) {
        toast.error("Enter an event code first");
        return;
      }
      try {
        if (args.delegationType === "team") {
          await createTeamDuty(
            createDuty,
            organisation._id,
            eventCode.trim(),
            args
          );
        } else {
          await createPositionDuty(
            createDuty,
            organisation._id,
            eventCode.trim(),
            args
          );
        }
        if (!options?.silent) {
          toast.success("Assignment created");
        }
      } catch (error) {
        const msg =
          error instanceof Error
            ? error.message
            : "Failed to create assignment";
        toast.error(msg);
        throw error;
      }
    },
    [organisation, eventCode, createDuty]
  );

  const handleDelete = useCallback(
    async (dutyId: Id<"scoutingDuties">) => {
      try {
        await deleteDuty({ dutyId });
        toast.success("Assignment removed");
      } catch {
        toast.error("Failed to remove assignment");
      }
    },
    [deleteDuty]
  );

  const handleToggleActive = useCallback(
    async (duty: Duty) => {
      try {
        await updateDuty({ dutyId: duty._id, isActive: !duty.isActive });
        toast.success(
          duty.isActive ? "Assignment paused" : "Assignment resumed"
        );
      } catch {
        toast.error("Failed to update assignment");
      }
    },
    [updateDuty]
  );

  const dutiesByScout = new Map<string, Duty[]>();
  const scoutNames = new Map<string, string>();
  for (const s of scouts ?? []) {
    scoutNames.set(s.userId, s.displayName);
  }
  for (const duty of duties ?? []) {
    const list = dutiesByScout.get(duty.scout) ?? [];
    list.push(duty);
    dutiesByScout.set(duty.scout, list);
  }

  const hasEventCode = eventCode.trim().length > 0;
  const isLoadingDuties = hasEventCode && duties === undefined;
  const totalAssignments = duties?.length ?? 0;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="sm-event-code">
          Enter an Event Code to view Assignments
        </Label>
        <Input
          id="sm-event-code"
          onChange={(e) => setEventCode(e.target.value.toUpperCase())}
          placeholder="e.g, AUSC..."
          value={eventCode}
        />
      </div>

      {hasEventCode ? (
        <AssignmentContent
          duties={duties ?? []}
          dutiesByScout={dutiesByScout}
          isCreateOpen={isCreateOpen}
          isLoadingDuties={isLoadingDuties}
          onCreate={handleCreate}
          onCreateOpenChange={setIsCreateOpen}
          onDelete={handleDelete}
          onToggleActive={handleToggleActive}
          onViewModeChange={setViewMode}
          scoutNames={scoutNames}
          scouts={scouts ?? []}
          totalAssignments={totalAssignments}
          viewMode={viewMode}
        />
      ) : null}
    </div>
  );
}

type AssignmentContentProps = {
  scouts: Array<{ userId: string; displayName: string; role: string }>;
  duties: Duty[];
  dutiesByScout: Map<string, Duty[]>;
  scoutNames: Map<string, string>;
  viewMode: "list" | "grid";
  isLoadingDuties: boolean;
  isCreateOpen: boolean;
  totalAssignments: number;
  onViewModeChange: (mode: "list" | "grid") => void;
  onCreateOpenChange: (open: boolean) => void;
  onCreate: (args: CreateArgs, options?: { silent?: boolean }) => Promise<void>;
  onToggleActive: (duty: Duty) => void;
  onDelete: (dutyId: Id<"scoutingDuties">) => void;
};

function AssignmentContent({
  scouts,
  duties,
  dutiesByScout,
  scoutNames,
  viewMode,
  isLoadingDuties,
  totalAssignments,
  onViewModeChange,
  onCreate,
  onToggleActive,
  onDelete,
}: AssignmentContentProps) {
  const [slotDialog, setSlotDialog] = useState<SlotTarget | null>(null);

  const onAssignPosition = useCallback(
    async (scoutId: string, alliance: "Red" | "Blue", position: number) => {
      await onCreate({
        scout: scoutId,
        delegationType: "position",
        allianceColour: alliance,
        alliancePosition: position,
      });
    },
    [onCreate]
  );

  const onAssignTeam = useCallback(
    async (scoutId: string, teamNumber: number) => {
      await onCreate({
        scout: scoutId,
        delegationType: "team",
        teamNumber: String(teamNumber),
      });
    },
    [onCreate]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">
            {viewMode === "list" ? "Scouts" : "Position grid"}
          </span>
          {!isLoadingDuties && totalAssignments > 0 ? (
            <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-xs">
              {totalAssignments} assignment{totalAssignments !== 1 ? "s" : ""}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className="rounded-r-none border-r"
                  onClick={() => onViewModeChange("list")}
                  size="sm"
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                >
                  <ListIcon className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>List view</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className="rounded-l-none"
                  onClick={() => onViewModeChange("grid")}
                  size="sm"
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                >
                  <LayoutGrid className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Grid view</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>

      {viewMode === "grid" ? (
        <DutiesGrid
          duties={duties}
          onPositionClick={
            isLoadingDuties
              ? undefined
              : (alliance, position) => setSlotDialog({ alliance, position })
          }
          scoutNames={scoutNames}
        />
      ) : isLoadingDuties ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton className="h-20 w-full rounded-lg" key={i} />
          ))}
        </div>
      ) : scouts.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No scouts in your organisation yet.
        </p>
      ) : (
        <div className="space-y-2">
          {scouts.map((scout) => (
            <ScoutRow
              assignDisabled={isLoadingDuties}
              {...(isLoadingDuties
                ? { assignDisabledReason: "Loading assignments…" as const }
                : {})}
              duties={dutiesByScout.get(scout.userId) ?? []}
              key={scout.userId}
              onAssignPosition={onAssignPosition}
              onAssignTeam={onAssignTeam}
              onDelete={onDelete}
              onToggleActive={onToggleActive}
              scout={scout}
            />
          ))}
        </div>
      )}
      <PositionSlotDialog
        duties={duties}
        onAdd={onCreate}
        onClose={() => setSlotDialog(null)}
        onRemove={onDelete}
        scoutNames={scoutNames}
        scouts={scouts}
        slot={slotDialog}
      />
    </div>
  );
}
