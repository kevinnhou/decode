"use client";

import { api } from "@decode/backend/convex/_generated/api";
import { Badge } from "@decode/ui/components/badge";
import { Button } from "@decode/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@decode/ui/components/card";
import { Separator } from "@decode/ui/components/separator";
import { Skeleton } from "@decode/ui/components/skeleton";
import { useQuery } from "convex/react";
import { ArrowLeft, ClipboardList } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useParams } from "next/navigation";

// --- Types ---

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
  autoPath?: { coordinates: { x: number; y: number }; timestamp: string }[];
  notes?: string;
  scoutName: string;
  createdAt: number;
};

// --- Constants ---

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
  transition: "Transition",
};

// --- Helpers ---

function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) {
    return `${s}s`;
  }
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

// --- Sub-components ---

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

function FieldEventsList({ events }: { events: FrcFieldEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No field events recorded.</p>
    );
  }
  return (
    <div className="space-y-1.5">
      {events.map((ev) => (
        <div
          className="flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-xs"
          key={`${ev.period}-${ev.eventType}-${ev.startTimestamp}`}
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

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: PASS
function SubmissionCard({
  sub,
  eventCode,
}: {
  sub: MatchSub;
  eventCode: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-wrap items-center gap-2 text-sm">
          <Link
            className="font-mono font-semibold hover:underline"
            href={`/analyse/${eventCode}/teams/${sub.teamNumber}` as Route}
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
          {sub.climbLevel !== undefined && sub.climbLevel > 0 ? (
            <Badge className="text-xs" variant="secondary">
              Climb L{sub.climbLevel}
              {sub.climbDuration !== undefined
                ? ` · ${formatDuration(sub.climbDuration)}`
                : null}
            </Badge>
          ) : null}
          <span className="ml-auto font-normal text-muted-foreground text-xs">
            Scouted by {sub.scoutName}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {sub.inputMode === "form" && sub.periodData ? (
          <div>
            <p className="mb-2 text-muted-foreground text-xs">Period Data</p>
            <PeriodDataTable pd={sub.periodData} />
          </div>
        ) : null}

        {sub.inputMode === "field" && sub.frcFieldEvents ? (
          <div>
            <p className="mb-2 text-muted-foreground text-xs">
              Field Events ({sub.frcFieldEvents.length})
            </p>
            <FieldEventsList events={sub.frcFieldEvents} />
          </div>
        ) : null}

        {(sub.autoPath?.length ?? 0) > 0 ? (
          <div>
            <p className="mb-1 text-muted-foreground text-xs">
              Auto Path — {sub.autoPath?.length ?? 0} point
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
      </CardContent>
    </Card>
  );
}

// --- Main page ---

export default function MatchViewer() {
  const params = useParams<{ eventCode: string; matchNumber: string }>();
  const { eventCode, matchNumber: matchNumberStr } = params;
  const matchNumber = Number.parseInt(matchNumberStr, 10);

  const submissions = useQuery(api.analysis.getMatchSubmissionsForMatch, {
    eventCode,
    matchNumber,
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
            href={`/analyse/${eventCode}` as Route}
          >
            {eventCode}
          </Link>
          <span>/</span>
          <span className="text-foreground">Q{matchNumber}</span>
        </div>

        <div className="flex items-center gap-3">
          <Link href={`/analyse/${eventCode}` as Route}>
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
            <SubmissionCard eventCode={eventCode} key={sub._id} sub={sub} />
          ))}
        </div>
      )}
    </div>
  );
}
