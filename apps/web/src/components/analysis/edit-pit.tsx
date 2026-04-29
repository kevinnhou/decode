"use client";

import { api } from "@decode/backend/convex/_generated/api";
import type { Id } from "@decode/backend/convex/_generated/dataModel";
import { Button } from "@decode/ui/components/button";
import { Checkbox } from "@decode/ui/components/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Separator } from "@decode/ui/components/separator";
import { toast } from "@decode/ui/components/sonner";
import { Textarea } from "@decode/ui/components/textarea";
import { useMutation, useQuery } from "convex/react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import NextImage from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { getPhotoUploadUrl } from "@/app/scout/frc/pit/actions";
import { useIsOnline } from "@/hooks/use-is-online";
import type { AnalyseCompetitionType } from "@/lib/analyse";
import {
  DRIVETRAIN_TYPE_OPTIONS,
  INTAKE_METHOD_OPTIONS,
} from "@/lib/form/constants";

type PitSubRow = {
  _id: Id<"pitSubmissions">;
  scoutName: string;
  createdAt: number;
  updatedAt: number;
  robotDimensions?: { length: number; width: number; height: number };
  drivetrainType?: "swerve" | "tank" | "other";
  weight?: number;
  photos: string[];
  photoItems: { storageId: string; url: string | null }[];
  notes?: string;
  canShootDeep?: boolean;
  hopperCapacity?: number;
  shootingSpeed?: number;
  intakeMethods?: ("floor" | "depot" | "outpost")[];
  canPassTrench?: boolean;
  canCrossBump?: boolean;
  maxClimbLevel?: 0 | 1 | 2 | 3;
  autoCapabilities?: string;
};

function formatPitSubLabel(s: PitSubRow) {
  const d = new Date(s.createdAt);
  return `${s.scoutName} · ${d.toLocaleString()}`;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: pit edit dialog (photos + FTC/FRC fields)
export function EditPit({
  open,
  onOpenChange,
  eventCode,
  teamNumber,
  competitionType,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventCode: string;
  teamNumber: number;
  competitionType: AnalyseCompetitionType;
}) {
  const isOnline = useIsOnline();
  const pitSubs = useQuery(
    api.analysis.getTeamPitSubmissions,
    open && eventCode ? { eventCode, teamNumber, competitionType } : "skip"
  ) as PitSubRow[] | undefined;

  const updatePitSubmission = useMutation(api.submissions.updatePitSubmission);
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedId, setSelectedId] = useState<Id<"pitSubmissions"> | null>(
    null
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [robotL, setRobotL] = useState("");
  const [robotW, setRobotW] = useState("");
  const [robotH, setRobotH] = useState("");
  const [drivetrainType, setDrivetrainType] = useState<
    "swerve" | "tank" | "other" | ""
  >("");
  const [weight, setWeight] = useState("");
  const [notes, setNotes] = useState("");
  const [autoCap, setAutoCap] = useState("");
  const [hopper, setHopper] = useState("");
  const [shooting, setShooting] = useState("");
  const [intake, setIntake] = useState<Set<"floor" | "depot" | "outpost">>(
    new Set()
  );
  const [canPassTrench, setCanPassTrench] = useState(false);
  const [canCrossBump, setCanCrossBump] = useState(false);
  const [canShootDeep, setCanShootDeep] = useState(false);
  const [maxClimb, setMaxClimb] = useState<string>("");
  const [photoIds, setPhotoIds] = useState<string[]>([]);
  const [photoUrlById, setPhotoUrlById] = useState<Record<string, string>>({});

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: hydrate all pit fields from one row
  const loadRowIntoForm = useCallback((row: PitSubRow) => {
    const d = row.robotDimensions;
    setRobotL(d?.length !== undefined ? String(d.length) : "");
    setRobotW(d?.width !== undefined ? String(d.width) : "");
    setRobotH(d?.height !== undefined ? String(d.height) : "");
    setDrivetrainType(row.drivetrainType ?? "");
    setWeight(row.weight !== undefined ? String(row.weight) : "");
    setNotes(row.notes ?? "");
    setAutoCap(row.autoCapabilities ?? "");
    setHopper(
      row.hopperCapacity !== undefined ? String(row.hopperCapacity) : ""
    );
    setShooting(
      row.shootingSpeed !== undefined ? String(row.shootingSpeed) : ""
    );
    setIntake(new Set(row.intakeMethods ?? []));
    setCanPassTrench(row.canPassTrench === true);
    setCanCrossBump(row.canCrossBump === true);
    setCanShootDeep(row.canShootDeep === true);
    setMaxClimb(
      row.maxClimbLevel !== undefined ? String(row.maxClimbLevel) : ""
    );
    setPhotoIds([...row.photos]);
    const urls: Record<string, string> = {};
    for (const p of row.photoItems) {
      if (p.url) {
        urls[p.storageId] = p.url;
      }
    }
    setPhotoUrlById(urls);
  }, []);

  useEffect(() => {
    if (!open) {
      setSelectedId(null);
    }
  }, [open]);

  useEffect(() => {
    if (!(open && pitSubs && pitSubs.length > 0)) {
      return;
    }
    const row =
      (selectedId ? pitSubs.find((s) => s._id === selectedId) : null) ??
      pitSubs[0];
    if (row._id !== selectedId) {
      setSelectedId(row._id);
      return;
    }
    loadRowIntoForm(row);
  }, [open, selectedId, loadRowIntoForm, pitSubs]);

  const handleSelectSubmission = (id: string) => {
    const row = pitSubs?.find((s) => s._id === id);
    if (row) {
      setSelectedId(row._id);
      loadRowIntoForm(row);
    }
  };

  const parseNum = (s: string): number | undefined => {
    const t = s.trim();
    if (t === "") {
      return;
    }
    const n = Number.parseFloat(t);
    return Number.isFinite(n) ? n : undefined;
  };

  const toggleIntake = (m: "floor" | "depot" | "outpost") => {
    setIntake((prev) => {
      const next = new Set(prev);
      if (next.has(m)) {
        next.delete(m);
      } else {
        next.add(m);
      }
      return next;
    });
  };

  const handleRemovePhoto = (id: string) => {
    setPhotoIds((prev) => prev.filter((x) => x !== id));
    setPhotoUrlById((prev) => {
      const { [id]: _, ...rest } = prev;
      return rest;
    });
  };

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: sequential Convex uploads
  const handleAddPhotos = async (files: FileList | null) => {
    if (!files?.length) {
      return;
    }
    if (!isOnline) {
      toast.error("Connect to the network to upload photos.");
      return;
    }
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name} is not an image.`);
          continue;
        }
        const uploadResult = await getPhotoUploadUrl();
        if (!(uploadResult.success && uploadResult.uploadUrl)) {
          throw new Error(uploadResult.message);
        }
        const res = await fetch(uploadResult.uploadUrl, {
          method: "POST",
          body: file,
          headers: { "Content-Type": file.type },
        });
        if (!res.ok) {
          throw new Error(`Upload failed for ${file.name}`);
        }
        const { storageId } = (await res.json()) as { storageId: string };
        const objectUrl = URL.createObjectURL(file);
        setPhotoIds((prev) => [...prev, storageId]);
        setPhotoUrlById((prev) => ({ ...prev, [storageId]: objectUrl }));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) {
        fileRef.current.value = "";
      }
    }
  };

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: FRC vs FTC Convex patch args
  const handleSave = async () => {
    if (!selectedId) {
      return;
    }
    setSaving(true);
    try {
      const l = parseNum(robotL);
      const w = parseNum(robotW);
      const h = parseNum(robotH);
      const robotDimensions =
        l !== undefined && w !== undefined && h !== undefined
          ? { length: l, width: w, height: h }
          : undefined;

      await updatePitSubmission({
        pitSubmissionId: selectedId,
        robotDimensions,
        drivetrainType: drivetrainType === "" ? undefined : drivetrainType,
        photos: photoIds,
        notes: notes.trim() === "" ? undefined : notes,
        autoCapabilities: autoCap.trim() === "" ? undefined : autoCap,
        weight: parseNum(weight),
        maxClimbLevel:
          maxClimb === ""
            ? undefined
            : (Number.parseInt(maxClimb, 10) as 0 | 1 | 2 | 3),
        intakeMethods: intake.size > 0 ? Array.from(intake) : undefined,
        hopperCapacity: parseNum(hopper),
        shootingSpeed: parseNum(shooting),
        canPassTrench: competitionType === "FRC" ? canPassTrench : undefined,
        canCrossBump: competitionType === "FRC" ? canCrossBump : undefined,
        canShootDeep: competitionType === "FTC" ? canShootDeep : undefined,
      });
      toast.success("Pit scouting updated.");
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const isFrc = competitionType === "FRC";

  const drivetrainSelectValue =
    drivetrainType === "" ? "__none__" : drivetrainType;
  const maxClimbSelectValue = maxClimb === "" ? "__none__" : maxClimb;

  const handleDrivetrainSelect = (v: string) => {
    if (v === "__none__") {
      setDrivetrainType("");
    } else {
      setDrivetrainType(v as "swerve" | "tank" | "other");
    }
  };

  const handleMaxClimbSelect = (v: string) => {
    if (v === "__none__") {
      setMaxClimb("");
    } else {
      setMaxClimb(v);
    }
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="flex max-h-[90vh] max-w-xl flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="space-y-1 border-b px-6 py-4 text-left">
          <DialogTitle className="text-base">Edit Pit Scouting</DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs">
            Team {teamNumber} · {competitionType} · {eventCode}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {pitSubs === undefined ? (
            <div className="flex justify-center py-12">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : pitSubs.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm">
              No pit submissions to edit for this team.
            </p>
          ) : (
            <div className="space-y-6">
              {pitSubs.length > 1 ? (
                <div className="space-y-2">
                  <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                    Submission
                  </p>
                  <Label className="sr-only" htmlFor="pit-sub-pick">
                    Choose pit submission
                  </Label>
                  <Select
                    onValueChange={handleSelectSubmission}
                    value={selectedId ?? undefined}
                  >
                    <SelectTrigger className="w-full" id="pit-sub-pick">
                      <SelectValue placeholder="Choose submission" />
                    </SelectTrigger>
                    <SelectContent>
                      {pitSubs.map((s) => (
                        <SelectItem key={s._id} value={s._id}>
                          {formatPitSubLabel(s)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              <div className="space-y-3">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                    Photos
                  </p>
                  <input
                    accept="image/*"
                    className="hidden"
                    multiple
                    onChange={(e) => handleAddPhotos(e.target.files)}
                    ref={fileRef}
                    type="file"
                  />
                  <Button
                    className="h-8 shrink-0"
                    disabled={uploading}
                    onClick={() => fileRef.current?.click()}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    {uploading ? (
                      <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                    ) : (
                      <ImagePlus className="mr-1.5 size-3.5" />
                    )}
                    Add
                  </Button>
                </div>
                {photoIds.length === 0 ? (
                  <p className="rounded-md border border-dashed bg-muted/40 px-3 py-6 text-center text-muted-foreground text-xs">
                    No photos yet. Use Add to upload.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2.5">
                    {photoIds.map((id) => {
                      const src = photoUrlById[id];
                      return (
                        <div
                          className="group relative size-24 overflow-hidden rounded-lg border bg-muted shadow-sm"
                          key={id}
                        >
                          {src ? (
                            <NextImage
                              alt=""
                              className="object-cover transition-opacity group-hover:opacity-90"
                              fill
                              sizes="96px"
                              src={src}
                              unoptimized={src.startsWith("blob:")}
                            />
                          ) : (
                            <div className="flex size-full items-center justify-center px-1 text-center text-[10px] text-muted-foreground leading-tight">
                              No preview
                            </div>
                          )}
                          <Button
                            aria-label="Remove photo"
                            className="absolute top-1.5 right-1.5 size-7 opacity-90 shadow-sm transition-opacity hover:opacity-100"
                            onClick={() => handleRemovePhoto(id)}
                            size="icon"
                            type="button"
                            variant="secondary"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-4">
                <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  Robot
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs" htmlFor="pit-dim-l">
                      Length (cm)
                    </Label>
                    <Input
                      id="pit-dim-l"
                      onChange={(e) => setRobotL(e.target.value)}
                      value={robotL}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs" htmlFor="pit-dim-w">
                      Width (cm)
                    </Label>
                    <Input
                      id="pit-dim-w"
                      onChange={(e) => setRobotW(e.target.value)}
                      value={robotW}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs" htmlFor="pit-dim-h">
                      Height (cm)
                    </Label>
                    <Input
                      id="pit-dim-h"
                      onChange={(e) => setRobotH(e.target.value)}
                      value={robotH}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs" htmlFor="pit-drivetrain">
                      Drivetrain
                    </Label>
                    <Select
                      onValueChange={handleDrivetrainSelect}
                      value={drivetrainSelectValue}
                    >
                      <SelectTrigger className="w-full" id="pit-drivetrain">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Not set</SelectItem>
                        {DRIVETRAIN_TYPE_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs" htmlFor="pit-weight">
                      Weight (kg)
                    </Label>
                    <Input
                      id="pit-weight"
                      onChange={(e) => setWeight(e.target.value)}
                      value={weight}
                    />
                  </div>
                </div>
              </div>

              {isFrc ? (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                      Scoring & traversal
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs" htmlFor="pit-hopper">
                          Hopper capacity
                        </Label>
                        <Input
                          id="pit-hopper"
                          onChange={(e) => setHopper(e.target.value)}
                          value={hopper}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs" htmlFor="pit-shooting">
                          Shooting speed (/s)
                        </Label>
                        <Input
                          id="pit-shooting"
                          onChange={(e) => setShooting(e.target.value)}
                          value={shooting}
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-x-6 gap-y-2 rounded-md border bg-muted/30 px-3 py-2.5">
                      <span className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={canPassTrench}
                          id="pit-trench"
                          onCheckedChange={(c) => setCanPassTrench(c === true)}
                        />
                        <Label
                          className="cursor-pointer font-normal text-sm"
                          htmlFor="pit-trench"
                        >
                          Trench
                        </Label>
                      </span>
                      <span className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={canCrossBump}
                          id="pit-bump"
                          onCheckedChange={(c) => setCanCrossBump(c === true)}
                        />
                        <Label
                          className="cursor-pointer font-normal text-sm"
                          htmlFor="pit-bump"
                        >
                          Bump
                        </Label>
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <Separator />
                  <div className="rounded-md border bg-muted/30 px-3 py-2.5">
                    <span className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={canShootDeep}
                        id="pit-deep"
                        onCheckedChange={(c) => setCanShootDeep(c === true)}
                      />
                      <Label
                        className="cursor-pointer font-normal text-sm"
                        htmlFor="pit-deep"
                      >
                        Can shoot deep
                      </Label>
                    </span>
                  </div>
                </>
              )}

              <Separator />

              <div className="space-y-4">
                <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  Intake & climb
                </p>
                <div className="flex flex-wrap gap-x-5 gap-y-2 rounded-md border bg-muted/30 px-3 py-2.5">
                  {INTAKE_METHOD_OPTIONS.map((o) => (
                    <span
                      className="flex items-center gap-2 text-sm"
                      key={o.id}
                    >
                      <Checkbox
                        checked={intake.has(o.id)}
                        id={`pit-intake-${o.id}`}
                        onCheckedChange={() => toggleIntake(o.id)}
                      />
                      <Label
                        className="cursor-pointer font-normal text-sm"
                        htmlFor={`pit-intake-${o.id}`}
                      >
                        {o.label}
                      </Label>
                    </span>
                  ))}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs" htmlFor="pit-climb">
                    Max climb
                  </Label>
                  <Select
                    onValueChange={handleMaxClimbSelect}
                    value={maxClimbSelectValue}
                  >
                    <SelectTrigger
                      className="w-full sm:max-w-xs"
                      id="pit-climb"
                    >
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Not set</SelectItem>
                      <SelectItem value="0">None</SelectItem>
                      <SelectItem value="1">Level 1</SelectItem>
                      <SelectItem value="2">Level 2</SelectItem>
                      <SelectItem value="3">Level 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  Notes
                </p>
                <div className="space-y-1.5">
                  <Label className="text-xs" htmlFor="pit-auto">
                    Auto capabilities
                  </Label>
                  <Textarea
                    className="min-h-[72px] resize-y"
                    id="pit-auto"
                    onChange={(e) => setAutoCap(e.target.value)}
                    rows={3}
                    value={autoCap}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs" htmlFor="pit-notes">
                    Pit notes
                  </Label>
                  <Textarea
                    className="min-h-[72px] resize-y"
                    id="pit-notes"
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    value={notes}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 border-t bg-muted/20 px-6 py-4 sm:justify-end">
          <Button
            onClick={() => onOpenChange(false)}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            disabled={saving || !pitSubs?.length || !selectedId}
            onClick={handleSave}
            type="button"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
