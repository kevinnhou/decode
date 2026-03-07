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
  DialogTrigger,
} from "@decode/ui/components/dialog";
import { Input } from "@decode/ui/components/input";
import { Label } from "@decode/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@decode/ui/components/select";
import { Skeleton } from "@decode/ui/components/skeleton";
import { toast } from "@decode/ui/components/sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@decode/ui/components/tooltip";
import { useMutation, useQuery } from "convex/react";
import {
  LayoutGrid,
  List as ListIcon,
  PauseCircle,
  PlayCircle,
  Plus,
  Trash2,
} from "lucide-react";
import { useCallback, useState } from "react";
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
};

function ScoutRow({ scout, duties, onToggleActive, onDelete }: ScoutRowProps) {
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
      </div>
    </div>
  );
}

type CreateAssignmentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scouts: Array<{ userId: string; displayName: string; role: string }>;
  onSubmit: (args: CreateArgs) => Promise<void>;
};

function CreateAssignmentDialog({
  open,
  onOpenChange,
  scouts,
  onSubmit,
}: CreateAssignmentDialogProps) {
  const [scout, setScout] = useState("");
  const [type, setType] = useState<"team" | "position">("team");
  const [teamNumber, setTeamNumber] = useState("");
  const [alliance, setAlliance] = useState<"Red" | "Blue">("Red");
  const [position, setPosition] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleClose() {
    onOpenChange(false);
    setScout("");
    setTeamNumber("");
  }

  async function handleSubmit() {
    if (!scout) {
      toast.error("Select a scout");
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit({
        scout,
        delegationType: type,
        teamNumber,
        allianceColour: alliance,
        alliancePosition: position,
      });
      handleClose();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogTrigger asChild>
        <Button size="sm" type="button">
          <Plus className="size-3.5" />
          Add assignment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Assignment</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 py-1">
          <div className="space-y-2">
            <Label>Scout</Label>
            <Select onValueChange={setScout} value={scout}>
              <SelectTrigger>
                <SelectValue placeholder="Select a scout…" />
              </SelectTrigger>
              <SelectContent>
                {scouts.map((s) => (
                  <SelectItem key={s.userId} value={s.userId}>
                    <span>{s.displayName}</span>
                    <span className="ml-1.5 text-muted-foreground text-xs capitalize">
                      {s.role === "leadScout" ? "Lead Scout" : s.role}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Assignment Type</Label>
            <Select
              onValueChange={(v) => setType(v as "team" | "position")}
              value={type}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="team">Track a specific team</SelectItem>
                <SelectItem value="position">
                  Track an alliance position
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {type === "team" ? (
            <div className="space-y-2">
              <Label>Team Number</Label>
              <Input
                inputMode="numeric"
                onChange={(e) => setTeamNumber(e.target.value)}
                placeholder="e.g. 1234"
                value={teamNumber}
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Alliance</Label>
                <Select
                  onValueChange={(v) => setAlliance(v as "Red" | "Blue")}
                  value={alliance}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Red">
                      <span className="text-red-600 dark:text-red-400">
                        Red
                      </span>
                    </SelectItem>
                    <SelectItem value="Blue">
                      <span className="text-blue-600 dark:text-blue-400">
                        Blue
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Position</Label>
                <Select
                  onValueChange={(v) => setPosition(Number(v))}
                  value={String(position)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Position 1</SelectItem>
                    <SelectItem value="2">Position 2</SelectItem>
                    <SelectItem value="3">Position 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={handleClose} type="button" variant="outline">
            Cancel
          </Button>
          <Button disabled={isSubmitting} onClick={handleSubmit} type="button">
            {isSubmitting ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
    async (args: CreateArgs) => {
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
        toast.success("Assignment created");
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
  onCreate: (args: CreateArgs) => Promise<void>;
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
  isCreateOpen,
  totalAssignments,
  onViewModeChange,
  onCreateOpenChange,
  onCreate,
  onToggleActive,
  onDelete,
}: AssignmentContentProps) {
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
          <CreateAssignmentDialog
            onOpenChange={onCreateOpenChange}
            onSubmit={onCreate}
            open={isCreateOpen}
            scouts={scouts}
          />
        </div>
      </div>

      {viewMode === "grid" ? (
        <DutiesGrid duties={duties} scoutNames={scoutNames} />
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
              duties={dutiesByScout.get(scout.userId) ?? []}
              key={scout.userId}
              onDelete={onDelete}
              onToggleActive={onToggleActive}
              scout={scout}
            />
          ))}
        </div>
      )}
    </div>
  );
}
