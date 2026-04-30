"use client";

import {
  type FrcFieldEvent as AnalyticsFrcFieldEvent,
  countFrcScoringEvents,
  FRC_PERIOD_ORDER,
  perPeriodScoringFromFieldEvents,
  sumDefenseEventSeconds,
} from "@decode/analytics";
import { api } from "@decode/backend/convex/_generated/api";
import type { Id } from "@decode/backend/convex/_generated/dataModel";
import { Badge } from "@decode/ui/components/badge";
import { Button } from "@decode/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@decode/ui/components/card";
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
import { Skeleton } from "@decode/ui/components/skeleton";
import { toast } from "@decode/ui/components/sonner";
import { Textarea } from "@decode/ui/components/textarea";
import { cn } from "@decode/ui/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, ClipboardList, Loader2, Pencil } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { type ChangeEvent, useState } from "react";
import {
  type AnalyseCompetitionType,
  formatDuration,
  PERIOD_LABELS_SHORT,
  parseAnalyseCompetitionType,
  withAnalyseCompetition,
} from "@/lib/analyse";

const FRC_FIELD_COORD_MAX = 2547;

type PeriodData = {
  auto: { scoring: number; feeding: number; defense: number };
  transition: { scoring: number; feeding: number; defense: number };
  shift1: { scoring: number; feeding: number; defense: number };
  shift2: { scoring: number; feeding: number; defense: number };
  shift3: { scoring: number; feeding: number; defense: number };
  shift4: { scoring: number; feeding: number; defense: number };
  endGame: { scoring: number; feeding: number; defense: number };
};

type FrcFieldEvent = {
  coordinates: { x: number; y: number };
  startTimestamp: string;
  endTimestamp: string;
  duration: number;
  period: string;
  eventType: string;
  action?: string;
  source?: string;
  climbLevel?: number;
};

type FtcFieldEvent = {
  event: string;
  count: number;
  coordinates: { x: number; y: number };
  timestamp: string;
};

type MatchSub = {
  _id: string;
  teamNumber: number;
  allianceColour: "Red" | "Blue";
  matchStage: string;
  inputMode: string;
  climbLevel?: number;
  climbDuration?: number;
  periodData?: PeriodData;
  frcFieldEvents?: FrcFieldEvent[];
  ftcPeriodData?: {
    auto: { made: number; missed: number };
    teleop: { made: number; missed: number };
  };
  fieldEvents?: FtcFieldEvent[];
  autoPath?: { coordinates: { x: number; y: number }; timestamp: string }[];
  notes?: string;
  scoutName: string;
  createdAt: number;
  autonomousMade?: number;
  autonomousMissed?: number;
  teleopMade?: number;
  teleopMissed?: number;
  tags?: string[];
};

const PERIOD_ORDER: (keyof PeriodData)[] = [
  "auto",
  "shift1",
  "shift2",
  "shift3",
  "shift4",
  "endGame",
  "transition",
];

const PERIOD_DISPLAY: Record<keyof PeriodData, string> = {
  auto: "Auto",
  shift1: "S1",
  shift2: "S2",
  shift3: "S3",
  shift4: "S4",
  endGame: "Endgame",
  transition: "Downtime",
};

function PeriodDataTable({ pd }: { pd: PeriodData }) {
  const rows = PERIOD_ORDER.map((key) => ({ key, val: pd[key] }));
  const totalScoring = rows.reduce((acc, { val }) => acc + val.scoring, 0);
  const totalFeeding = rows.reduce((acc, { val }) => acc + val.feeding, 0);
  const totalDefense = rows.reduce((acc, { val }) => acc + val.defense, 0);

  const fmt = (n: number) => n.toFixed(1);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground text-xs">
            <th className="pr-4 pb-2 font-normal">Period</th>
            <th className="pr-4 pb-2 text-right font-normal">Scoring (s)</th>
            <th className="pr-4 pb-2 text-right font-normal">Feeding (s)</th>
            <th className="pb-2 text-right font-normal">Defense (s)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ key, val }) => (
            <tr className="border-b" key={key}>
              <td className="py-1.5 pr-4 text-xs">{PERIOD_DISPLAY[key]}</td>
              <td className="py-1.5 pr-4 text-right font-mono text-xs">
                {fmt(val.scoring)}
              </td>
              <td className="py-1.5 pr-4 text-right font-mono text-xs">
                {fmt(val.feeding)}
              </td>
              <td className="py-1.5 text-right font-mono text-xs">
                {fmt(val.defense)}
              </td>
            </tr>
          ))}
          <tr className="border-t-2 font-medium italic">
            <td className="py-1.5 pr-4 font-bold text-xs">Total:</td>
            <td className="py-1.5 pr-4 text-right font-mono text-xs">
              {fmt(totalScoring)}
            </td>
            <td className="py-1.5 pr-4 text-right font-mono text-xs">
              {fmt(totalFeeding)}
            </td>
            <td className="py-1.5 text-right font-mono text-xs">
              {fmt(totalDefense)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function FtcPeriodDataTable({
  pd,
}: {
  pd: {
    auto: { made: number; missed: number };
    teleop: { made: number; missed: number };
  };
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground text-xs">
            <th className="pr-4 pb-2 font-normal">Period</th>
            <th className="pr-4 pb-2 text-right font-normal">Made</th>
            <th className="pb-2 text-right font-normal">Missed</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b">
            <td className="py-1.5 pr-4 text-xs">Auto</td>
            <td className="py-1.5 pr-4 text-right font-mono text-xs">
              {pd.auto.made}
            </td>
            <td className="py-1.5 text-right font-mono text-xs">
              {pd.auto.missed}
            </td>
          </tr>
          <tr className="border-b">
            <td className="py-1.5 pr-4 text-xs">Teleop</td>
            <td className="py-1.5 pr-4 text-right font-mono text-xs">
              {pd.teleop.made}
            </td>
            <td className="py-1.5 text-right font-mono text-xs">
              {pd.teleop.missed}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function FtcFieldEventsList({ events }: { events: FtcFieldEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No field events recorded.</p>
    );
  }
  return (
    <div className="space-y-1.5">
      {events.map((ev, i) => (
        <div
          className="flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-xs"
          key={`${ev.event}-${ev.timestamp}-${i}`}
        >
          <Badge className="text-xs capitalize" variant="outline">
            {ev.event.replace(/_/g, " ")}
          </Badge>
          <span className="font-mono text-muted-foreground">
            {ev.timestamp}
          </span>
          <span className="ml-auto font-mono">×{ev.count}</span>
        </div>
      ))}
    </div>
  );
}

function frcFieldMarkerClasses(ev: FrcFieldEvent): string {
  if (ev.eventType === "shooting" && ev.action === "scoring") {
    return "border-primary bg-primary/80";
  }
  if (ev.eventType === "shooting" && ev.action === "feeding") {
    return "border-sky-500 bg-sky-500/75";
  }
  if (ev.eventType === "defense") {
    return "border-amber-600 bg-amber-500/80";
  }
  if (ev.eventType === "intake") {
    return "border-muted-foreground bg-muted-foreground/60";
  }
  if (ev.eventType === "climb") {
    return "border-emerald-600 bg-emerald-500/85";
  }
  return "border-foreground/50 bg-foreground/35";
}

function FrcFieldInputSummary({ events }: { events: FrcFieldEvent[] }) {
  const typed = events as AnalyticsFrcFieldEvent[];
  const scoringTaps = countFrcScoringEvents(typed);
  const defenceSeconds = sumDefenseEventSeconds(typed);
  const defenceHolds = events.filter((e) => e.eventType === "defense").length;
  const perPeriod = perPeriodScoringFromFieldEvents(typed);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">
          {scoringTaps} scoring tap{scoringTaps !== 1 ? "s" : ""}
        </Badge>
        <Badge variant="secondary">
          {defenceHolds} defence hold{defenceHolds !== 1 ? "s" : ""} ·{" "}
          {defenceSeconds.toFixed(1)}s total
        </Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-muted-foreground text-xs">
            Scoring taps by period
          </p>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground text-xs">
                  <th className="px-3 py-2 font-normal">Period</th>
                  <th className="px-3 py-2 text-right font-normal">Taps</th>
                </tr>
              </thead>
              <tbody>
                {FRC_PERIOD_ORDER.map((period) => {
                  const n = perPeriod[period] ?? 0;
                  if (n === 0) {
                    return null;
                  }
                  return (
                    <tr className="border-b last:border-0" key={period}>
                      <td className="px-3 py-1.5 text-xs">
                        {PERIOD_LABELS_SHORT[period] ?? period}
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono text-xs">
                        {n}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {scoringTaps === 0 ? (
            <p className="mt-2 text-muted-foreground text-xs">
              No scoring taps recorded on the field for this submission.
            </p>
          ) : null}
        </div>

        <div>
          <p className="mb-2 text-muted-foreground text-xs">Field map</p>
          <div className="relative w-full overflow-hidden rounded-lg border bg-muted/20">
            <Image
              alt="FRC Field"
              className="w-full select-none"
              height={800}
              src="/frc-field.webp"
              width={1200}
            />
            {events.map((ev, i) => {
              const left = (ev.coordinates.x / FRC_FIELD_COORD_MAX) * 100;
              const top = (ev.coordinates.y / FRC_FIELD_COORD_MAX) * 100;
              return (
                <div
                  className={cn(
                    "-translate-x-1/2 -translate-y-1/2 pointer-events-none absolute size-3 rounded-full border-2 shadow-sm",
                    frcFieldMarkerClasses(ev)
                  )}
                  key={`${i}-${ev.period}-${ev.eventType}-${ev.startTimestamp}-${ev.endTimestamp}`}
                  style={{ left: `${left}%`, top: `${top}%` }}
                  title={`${ev.eventType}${ev.action ? ` · ${ev.action}` : ""} · ${ev.period.replace(/_/g, " ")}`}
                />
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed">
            Markers match scout colours: scoring, feeding, defence, intake,
            climb. Axes match normalised field coordinates.
          </p>
        </div>
      </div>

      <div>
        <p className="mb-2 text-muted-foreground text-xs">
          Event log ({events.length})
        </p>
        <FieldEventsList events={events} />
      </div>
    </div>
  );
}

function FieldEventsList({ events }: { events: FrcFieldEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No field events recorded.</p>
    );
  }
  return (
    <div className="space-y-1.5">
      {events.map((ev, i) => (
        <div
          className="flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-xs"
          key={`${i}-${ev.period}-${ev.eventType}-${ev.startTimestamp}-${ev.endTimestamp}`}
        >
          <Badge className="text-xs capitalize" variant="outline">
            {ev.eventType}
          </Badge>
          {ev.action ? (
            <Badge className="text-xs capitalize" variant="secondary">
              {ev.action}
            </Badge>
          ) : null}
          {ev.source ? (
            <span className="text-muted-foreground capitalize">
              {ev.source}
            </span>
          ) : null}
          <span className="text-muted-foreground">
            {ev.period.replace(/_/g, " ")}
          </span>
          <span className="ml-auto font-mono text-muted-foreground">
            {formatDuration(ev.duration)}
          </span>
        </div>
      ))}
    </div>
  );
}

function clonePeriodData(pd: PeriodData): PeriodData {
  return JSON.parse(JSON.stringify(pd)) as PeriodData;
}

function PeriodDataFormEditor({
  value,
  onChange,
}: {
  value: PeriodData;
  onChange: (next: PeriodData) => void;
}) {
  const rows = PERIOD_ORDER.map((key) => ({ key, val: value[key] }));
  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground text-xs">
            <th className="px-2 py-2 font-normal">Period</th>
            <th className="px-1 py-2 text-right font-normal">Scr (s)</th>
            <th className="px-1 py-2 text-right font-normal">Fd (s)</th>
            <th className="px-2 py-2 text-right font-normal">Def (s)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ key, val }) => (
            <tr className="border-b" key={key}>
              <td className="px-2 py-1 text-xs">{PERIOD_DISPLAY[key]}</td>
              {(["scoring", "feeding", "defense"] as const).map((field) => (
                <td className="p-1" key={field}>
                  <Input
                    className="h-8 font-mono text-xs"
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      const raw = e.target.value;
                      const n = Number.parseFloat(raw);
                      let num = 0;
                      if (raw !== "" && Number.isFinite(n)) {
                        num = n;
                      }
                      onChange({
                        ...value,
                        [key]: { ...value[key], [field]: num },
                      });
                    }}
                    value={String(val[field])}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FtcPeriodDraftEditor({
  value,
  onChange,
}: {
  value: NonNullable<MatchSub["ftcPeriodData"]>;
  onChange: (next: NonNullable<MatchSub["ftcPeriodData"]>) => void;
}) {
  const rows = [
    { label: "Auto made", period: "auto" as const, field: "made" as const },
    {
      label: "Auto missed",
      period: "auto" as const,
      field: "missed" as const,
    },
    {
      label: "Teleop made",
      period: "teleop" as const,
      field: "made" as const,
    },
    {
      label: "Teleop missed",
      period: "teleop" as const,
      field: "missed" as const,
    },
  ];
  return (
    <div className="grid gap-3 rounded-lg border bg-muted/20 p-3 sm:grid-cols-2">
      {rows.map((r) => (
        <div className="space-y-1" key={`${r.period}-${r.field}`}>
          <Label className="text-xs">{r.label}</Label>
          <Input
            className="h-8 font-mono text-xs"
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              const n = Number.parseInt(e.target.value, 10);
              const num = Number.isFinite(n) ? n : 0;
              onChange({
                ...value,
                [r.period]: { ...value[r.period], [r.field]: num },
              });
            }}
            type="number"
            value={value[r.period][r.field]}
          />
        </div>
      ))}
    </div>
  );
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: edit form + read-only branches
function SubmissionCard({
  sub,
  eventCode,
  competitionType,
}: {
  sub: MatchSub;
  eventCode: string;
  competitionType: AnalyseCompetitionType;
}) {
  const isFtc = competitionType === "FTC";
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const updateMatchSubmission = useMutation(
    api.submissions.updateMatchSubmission
  );

  const [draftPd, setDraftPd] = useState<PeriodData | null>(null);
  const [draftFtc, setDraftFtc] = useState<NonNullable<
    MatchSub["ftcPeriodData"]
  > | null>(null);
  const [draftNotes, setDraftNotes] = useState("");
  const [draftClimbLevel, setDraftClimbLevel] = useState("0");
  const [draftClimbDuration, setDraftClimbDuration] = useState("0");

  const beginEdit = () => {
    if (!isFtc && sub.inputMode === "form" && sub.periodData) {
      setDraftPd(clonePeriodData(sub.periodData));
    } else {
      setDraftPd(null);
    }
    if (isFtc) {
      const base =
        sub.ftcPeriodData ??
        ({
          auto: {
            made: sub.autonomousMade ?? 0,
            missed: sub.autonomousMissed ?? 0,
          },
          teleop: {
            made: sub.teleopMade ?? 0,
            missed: sub.teleopMissed ?? 0,
          },
        } satisfies NonNullable<MatchSub["ftcPeriodData"]>);
      setDraftFtc({
        auto: { ...base.auto },
        teleop: { ...base.teleop },
      });
    } else {
      setDraftFtc(null);
    }
    setDraftNotes(sub.notes ?? "");
    setDraftClimbLevel(String(sub.climbLevel ?? 0));
    setDraftClimbDuration(String(sub.climbDuration ?? 0));
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setDraftPd(null);
    setDraftFtc(null);
  };

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: FRC vs FTC save payloads
  const handleSave = async () => {
    setSaving(true);
    try {
      const id = sub._id as Id<"matchSubmissions">;
      if (isFtc) {
        await updateMatchSubmission({
          matchSubmissionId: id,
          notes: draftNotes.trim() === "" ? undefined : draftNotes,
          ...(draftFtc ? { ftcPeriodData: draftFtc } : {}),
        });
      } else {
        const climbLevelRaw = Number.parseInt(draftClimbLevel, 10);
        const climbLevel = (
          Number.isFinite(climbLevelRaw)
            ? Math.max(0, Math.min(3, climbLevelRaw))
            : 0
        ) as 0 | 1 | 2 | 3;
        const climbDurRaw = Number.parseFloat(draftClimbDuration);
        const climbDuration = Number.isFinite(climbDurRaw) ? climbDurRaw : 0;
        await updateMatchSubmission({
          matchSubmissionId: id,
          notes: draftNotes.trim() === "" ? undefined : draftNotes,
          climbLevel,
          climbDuration,
          ...(sub.inputMode === "form" && draftPd
            ? { periodData: draftPd }
            : {}),
        });
      }
      toast.success("Submission updated.");
      setEditing(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="border-b pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <CardTitle className="flex flex-wrap items-center gap-2 text-sm leading-snug">
            <Link
              className="font-mono font-semibold hover:underline"
              href={
                withAnalyseCompetition(
                  `/analyse/${eventCode}/teams/${sub.teamNumber}`,
                  competitionType
                ) as Route
              }
            >
              Team {sub.teamNumber}
            </Link>
            <Badge
              className={`text-xs ${
                sub.allianceColour === "Red"
                  ? "bg-red-500/10 text-red-600 dark:text-red-400"
                  : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
              }`}
              variant="outline"
            >
              {sub.allianceColour}
            </Badge>
            <Badge className="text-xs capitalize" variant="outline">
              {sub.inputMode}
            </Badge>
            {!isFtc && sub.climbLevel !== undefined && sub.climbLevel > 0 ? (
              <Badge className="text-xs" variant="secondary">
                Climb L{sub.climbLevel}
                {sub.climbDuration !== undefined
                  ? ` · ${formatDuration(sub.climbDuration)}`
                  : null}
              </Badge>
            ) : null}
          </CardTitle>
          <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
            <span className="text-muted-foreground text-xs sm:text-right">
              Scouted by {sub.scoutName}
            </span>
            {editing ? (
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  disabled={saving}
                  onClick={cancelEdit}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  Cancel
                </Button>
                <Button
                  disabled={saving}
                  onClick={handleSave}
                  size="sm"
                  type="button"
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    "Save"
                  )}
                </Button>
              </div>
            ) : (
              <Button
                className="h-8 gap-1.5 self-end"
                onClick={beginEdit}
                size="sm"
                type="button"
                variant="outline"
              >
                <Pencil className="size-3.5" />
                Edit
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {editing ? (
          <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
            {isFtc === true && draftFtc !== null ? (
              <div className="space-y-2">
                <FtcPeriodDraftEditor onChange={setDraftFtc} value={draftFtc} />
              </div>
            ) : null}
            {!isFtc && sub.inputMode === "form" && draftPd ? (
              <div className="space-y-2">
                <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  Period data (seconds)
                </p>
                <PeriodDataFormEditor onChange={setDraftPd} value={draftPd} />
              </div>
            ) : null}
            {isFtc ? null : (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs" htmlFor={`climb-lvl-${sub._id}`}>
                    Climb level
                  </Label>
                  <Select
                    onValueChange={setDraftClimbLevel}
                    value={draftClimbLevel}
                  >
                    <SelectTrigger id={`climb-lvl-${sub._id}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">None</SelectItem>
                      <SelectItem value="1">Level 1</SelectItem>
                      <SelectItem value="2">Level 2</SelectItem>
                      <SelectItem value="3">Level 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs" htmlFor={`climb-dur-${sub._id}`}>
                    Climb duration (s)
                  </Label>
                  <Input
                    id={`climb-dur-${sub._id}`}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setDraftClimbDuration(e.target.value)
                    }
                    type="number"
                    value={draftClimbDuration}
                  />
                </div>
              </div>
            )}
            {!isFtc && sub.inputMode === "field" ? (
              <p className="rounded-md border border-dashed bg-background/80 px-3 py-2 text-muted-foreground text-xs leading-relaxed">
                Field taps are not editable here. You can still adjust climb and
                notes.
              </p>
            ) : null}
            <div className="space-y-1.5">
              <Label className="text-xs" htmlFor={`notes-${sub._id}`}>
                Notes
              </Label>
              <Textarea
                className="min-h-[72px] resize-y"
                id={`notes-${sub._id}`}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                  setDraftNotes(e.target.value)
                }
                rows={3}
                value={draftNotes}
              />
            </div>
          </div>
        ) : (
          <>
            {isFtc ? (
              sub.ftcPeriodData !== undefined && sub.ftcPeriodData !== null ? (
                <div>
                  <FtcPeriodDataTable pd={sub.ftcPeriodData} />
                </div>
              ) : null
            ) : null}

            {!isFtc && sub.inputMode === "form" && sub.periodData ? (
              <div>
                <PeriodDataTable pd={sub.periodData} />
              </div>
            ) : null}

            {!isFtc && sub.inputMode === "field" && sub.frcFieldEvents ? (
              <div>
                <p className="mb-2 text-muted-foreground text-xs">
                  Field input
                </p>
                <FrcFieldInputSummary events={sub.frcFieldEvents} />
              </div>
            ) : null}

            {isFtc ? (
              sub.inputMode === "field" &&
              sub.fieldEvents !== undefined &&
              sub.fieldEvents.length > 0 ? (
                <div>
                  <p className="mb-2 text-muted-foreground text-xs">
                    ({sub.fieldEvents.length})
                  </p>
                  <FtcFieldEventsList events={sub.fieldEvents} />
                </div>
              ) : null
            ) : null}

            {!isFtc && (sub.autoPath?.length ?? 0) > 0 ? (
              <div>
                <p className="mb-1 text-muted-foreground text-xs">
                  Auto Path {sub.autoPath?.length ?? 0} point
                  {(sub.autoPath?.length ?? 0) !== 1 ? "s" : ""} recorded
                </p>
              </div>
            ) : null}

            {sub.notes ? (
              <div>
                <Separator className="mb-3" />
                <p className="mb-1 text-muted-foreground text-xs">Notes</p>
                <p className="text-sm">{sub.notes}</p>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function MatchViewer() {
  const params = useParams<{ eventCode: string; matchNumber: string }>();
  const { eventCode, matchNumber: matchNumberStr } = params;
  const matchNumber = Number.parseInt(matchNumberStr, 10);
  const searchParams = useSearchParams();
  const competitionType = parseAnalyseCompetitionType(
    searchParams.get("competitionType")
  );

  const submissions = useQuery(api.analysis.getMatchSubmissionsForMatch, {
    eventCode,
    matchNumber,
    competitionType,
  }) as MatchSub[] | undefined;

  const isLoading = submissions === undefined;

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-col gap-4">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Link className="hover:text-foreground" href={"/analyse" as Route}>
            Analyse
          </Link>
          <span>/</span>
          <Link
            className="hover:text-foreground"
            href={
              withAnalyseCompetition(
                `/analyse/${eventCode}`,
                competitionType
              ) as Route
            }
          >
            {eventCode}
          </Link>
          <span>/</span>
          <span className="text-foreground">Q{matchNumber}</span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={
              withAnalyseCompetition(
                `/analyse/${eventCode}`,
                competitionType
              ) as Route
            }
          >
            <Button size="icon" variant="ghost">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <h1 className="font-semibold text-xl tracking-tight">
              Qualification {matchNumber}
            </h1>
            <p className="text-muted-foreground text-sm">{eventCode}</p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: PASS
            <Skeleton className="h-48 rounded-xl" key={i} />
          ))}
        </div>
      ) : submissions.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <ClipboardList className="size-10 text-muted-foreground/50" />
          <div className="flex flex-col gap-1">
            <p className="font-medium text-sm">No submissions found</p>
            <p className="text-muted-foreground text-sm">
              No data was submitted for Q{matchNumber} at {eventCode}.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {submissions.map((sub) => (
            <SubmissionCard
              competitionType={competitionType}
              eventCode={eventCode}
              key={sub._id}
              sub={sub}
            />
          ))}
        </div>
      )}
    </div>
  );
}
