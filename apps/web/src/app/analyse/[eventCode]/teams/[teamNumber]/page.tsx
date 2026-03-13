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
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@decode/ui/components/chart";
import { Separator } from "@decode/ui/components/separator";
import { Skeleton } from "@decode/ui/components/skeleton";
import { useQuery } from "convex/react";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Gauge,
  GitCompareArrows,
  Target,
  TrendingUp,
  Wrench,
  XCircle,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useParams } from "next/navigation";
import type React from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

// --- Constants ---

const PERIOD_LABELS: Record<string, string> = {
  AUTO: "Auto",
  TRANSITION: "Trans.",
  SHIFT_1: "Shift 1",
  SHIFT_2: "Shift 2",
  SHIFT_3: "Shift 3",
  SHIFT_4: "Shift 4",
  END_GAME: "End",
};

const PERIOD_TO_PD_KEY: Record<string, string> = {
  AUTO: "auto",
  TRANSITION: "transition",
  SHIFT_1: "shift1",
  SHIFT_2: "shift2",
  SHIFT_3: "shift3",
  SHIFT_4: "shift4",
  END_GAME: "endGame",
};

const CHART_PERIODS = [
  "AUTO",
  "TRANSITION",
  "SHIFT_1",
  "SHIFT_2",
  "SHIFT_3",
  "SHIFT_4",
  "END_GAME",
] as const;

const CLIMB_LABELS: Record<number, string> = {
  0: "No climb",
  1: "Level 1",
  2: "Level 2",
  3: "Level 3",
};

const periodChartConfig: ChartConfig = {
  scoring: {
    label: "Scoring",
    color: "hsl(var(--chart-1))",
  },
};

// --- Types ---

type MatchSub = {
  _id: string;
  matchNumber: number;
  matchStage: string;
  allianceColour: "Red" | "Blue";
  climbLevel?: number;
  climbDuration?: number;
  inputMode: string;
  periodData?: Record<
    string,
    { scoring: number; feeding: number; defense: number }
  >;
  frcFieldEvents?: Array<{
    eventType: string;
    action?: string;
    duration: number;
    period: string;
  }>;
  notes?: string;
  scoutName: string;
};

type PitSub = {
  drivetrainType?: string;
  robotDimensions?: { length: number; width: number; height: number };
  weight?: number;
  hopperCapacity?: number;
  shootingSpeed?: number;
  intakeMethods?: string[];
  canPassTrench?: boolean;
  canCrossBump?: boolean;
  maxClimbLevel?: number;
  autoCapabilities?: string;
  notes?: string;
  scoutName: string;
};

// --- Helpers ---

function shiftPointsFromFuel(s1: number, s2: number, s3: number, s4: number) {
  const s13 = s1 + s3;
  const s24 = s2 + s4;
  return s13 >= s24 ? s13 : s24;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: PASS
function scoringPointsForMatch(
  sub: MatchSub,
  shootingSpeed?: number
): number | null {
  if (sub.inputMode === "form" && sub.periodData) {
    if (typeof shootingSpeed !== "number" || shootingSpeed <= 0) {
      return null;
    }
    const pd = sub.periodData;
    const secondsToFuel = (s: number) => Math.round(s * shootingSpeed);
    const auto = secondsToFuel(pd.auto?.scoring ?? 0);
    const shiftPts = shiftPointsFromFuel(
      secondsToFuel(pd.shift1?.scoring ?? 0),
      secondsToFuel(pd.shift2?.scoring ?? 0),
      secondsToFuel(pd.shift3?.scoring ?? 0),
      secondsToFuel(pd.shift4?.scoring ?? 0)
    );
    const transition = secondsToFuel(pd.transition?.scoring ?? 0);
    const endGame = secondsToFuel(pd.endGame?.scoring ?? 0);
    return auto + shiftPts + transition + endGame;
  }
  if (sub.inputMode === "field" && sub.frcFieldEvents) {
    const events = sub.frcFieldEvents.filter(
      (e) => e.eventType === "shooting" && e.action === "scoring"
    );
    const byPeriod: Record<string, number> = {};
    for (const e of events) {
      byPeriod[e.period] = (byPeriod[e.period] ?? 0) + 1;
    }
    const auto = byPeriod.AUTO ?? 0;
    const shiftPts = shiftPointsFromFuel(
      byPeriod.SHIFT_1 ?? 0,
      byPeriod.SHIFT_2 ?? 0,
      byPeriod.SHIFT_3 ?? 0,
      byPeriod.SHIFT_4 ?? 0
    );
    const transition = byPeriod.TRANSITION ?? 0;
    const endGame = byPeriod.END_GAME ?? 0;
    return auto + shiftPts + transition + endGame;
  }
  return 0;
}

function scoringForMatch(sub: MatchSub): number {
  if (sub.inputMode === "form" && sub.periodData) {
    return Object.values(sub.periodData).reduce(
      (sum, p) => sum + (p.scoring ?? 0),
      0
    );
  }
  if (sub.inputMode === "field" && sub.frcFieldEvents) {
    return sub.frcFieldEvents.filter(
      (e) => e.eventType === "shooting" && e.action === "scoring"
    ).length;
  }
  return 0;
}

function periodTotalsFromFormSub(
  sub: MatchSub,
  totals: Record<string, number>
): void {
  if (!sub.periodData) {
    return;
  }
  for (const period of CHART_PERIODS) {
    const pdKey = PERIOD_TO_PD_KEY[period] ?? period;
    totals[period] =
      (totals[period] ?? 0) + (sub.periodData[pdKey]?.scoring ?? 0);
  }
}

function periodTotalsFromFieldSub(
  sub: MatchSub,
  totals: Record<string, number>
): void {
  if (!sub.frcFieldEvents) {
    return;
  }
  for (const period of CHART_PERIODS) {
    totals[period] =
      (totals[period] ?? 0) +
      sub.frcFieldEvents.filter(
        (e) =>
          e.period === period &&
          e.eventType === "shooting" &&
          e.action === "scoring"
      ).length;
  }
}

function buildPeriodChartData(matchSubs: MatchSub[]) {
  const totals: Record<string, number> = {};
  let n = 0;
  for (const sub of matchSubs) {
    if (sub.inputMode === "form" && sub.periodData) {
      n += 1;
      periodTotalsFromFormSub(sub, totals);
    } else if (sub.inputMode === "field" && sub.frcFieldEvents) {
      n += 1;
      periodTotalsFromFieldSub(sub, totals);
    }
  }
  return CHART_PERIODS.map((period) => ({
    period: PERIOD_LABELS[period] ?? period,
    scoring: n > 0 ? Math.round(((totals[period] ?? 0) / n) * 10) / 10 : 0,
  }));
}

// --- Sub-components ---

function climbBadgeVariant(level?: number) {
  if (!level || level === 0) {
    return <Badge variant="outline">None</Badge>;
  }
  const colors: Record<number, string> = {
    1: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
    2: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    3: "bg-green-500/10 text-green-600 dark:text-green-400",
  };
  return (
    <Badge className={`text-xs ${colors[level] ?? ""}`}>
      {CLIMB_LABELS[level]}
    </Badge>
  );
}

function MetricCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon className="size-5 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <span className="font-mono font-semibold text-xl">{value}</span>
        {sub ? (
          <span className="text-muted-foreground text-xs"> {sub}</span>
        ) : null}
        <div className="mt-0.5 flex items-center gap-1.5">
          <span className="text-muted-foreground text-xs">{label}</span>
        </div>
      </div>
    </div>
  );
}

function PitCard({ pit }: { pit: PitSub }) {
  const intakeMethods = pit.intakeMethods ?? [];
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Wrench className="size-4 text-muted-foreground" />
          Pit Data
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          {pit.drivetrainType ? (
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground text-xs">Drivetrain</span>
              <span className="font-medium text-sm capitalize">
                {pit.drivetrainType}
              </span>
            </div>
          ) : null}
          {pit.weight !== undefined ? (
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground text-xs">Weight</span>
              <span className="font-medium text-sm">{pit.weight} kg</span>
            </div>
          ) : null}
          {pit.hopperCapacity !== undefined ? (
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground text-xs">
                Hopper Capacity
              </span>
              <span className="font-medium text-sm">{pit.hopperCapacity}</span>
            </div>
          ) : null}
          {pit.shootingSpeed !== undefined ? (
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground text-xs">
                Shooting Speed
              </span>
              <span className="font-medium text-sm">
                {pit.shootingSpeed} /s
              </span>
            </div>
          ) : null}
          {pit.maxClimbLevel !== undefined ? (
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground text-xs">
                Max Climb Capability
              </span>
              {climbBadgeVariant(pit.maxClimbLevel)}
            </div>
          ) : null}
          {pit.robotDimensions ? (
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground text-xs">
                Dimensions (cm)
              </span>
              <span className="font-medium text-sm">
                {pit.robotDimensions.length} × {pit.robotDimensions.width} ×{" "}
                {pit.robotDimensions.height}
              </span>
            </div>
          ) : null}
        </div>

        {intakeMethods.length > 0 ? (
          <div className="mt-3 flex flex-col gap-1">
            <span className="text-muted-foreground text-xs">
              Intake Methods
            </span>
            <div className="flex flex-wrap gap-1.5">
              {intakeMethods.map((m) => (
                <Badge className="text-xs capitalize" key={m} variant="outline">
                  {m}
                </Badge>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-3 flex gap-4">
          <span className="flex items-center gap-1.5">
            {pit.canPassTrench ? (
              <CheckCircle2 className="size-3.5 text-green-500" />
            ) : (
              <XCircle className="size-3.5 text-muted-foreground/50" />
            )}
            <span className="text-xs">Trench</span>
          </span>
          <span className="flex items-center gap-1.5">
            {pit.canCrossBump ? (
              <CheckCircle2 className="size-3.5 text-green-500" />
            ) : (
              <XCircle className="size-3.5 text-muted-foreground/50" />
            )}
            <span className="text-xs">Bump</span>
          </span>
        </div>

        {pit.autoCapabilities ? (
          <div className="mt-3 flex flex-col gap-1">
            <span className="text-muted-foreground text-xs">
              Auto Capabilities
            </span>
            <p className="text-sm">{pit.autoCapabilities}</p>
          </div>
        ) : null}

        {pit.notes ? (
          <div className="mt-3 flex flex-col gap-1">
            <span className="text-muted-foreground text-xs">Notes</span>
            <p className="text-sm">{pit.notes}</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function PerPeriodChart({ matchSubs }: { matchSubs: MatchSub[] }) {
  const data = buildPeriodChartData(matchSubs);
  const hasData = data.some((d) => d.scoring > 0);

  if (!hasData) {
    return (
      <div className="flex h-48 items-center justify-center text-muted-foreground text-sm">
        No period data available
      </div>
    );
  }

  return (
    <ChartContainer className="h-48 w-full" config={periodChartConfig}>
      <BarChart data={data}>
        <CartesianGrid vertical={false} />
        <XAxis
          axisLine={false}
          dataKey="period"
          tick={{ fontSize: 11 }}
          tickLine={false}
        />
        <YAxis
          axisLine={false}
          tick={{ fontSize: 11 }}
          tickLine={false}
          width={30}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar
          dataKey="scoring"
          fill="var(--color-scoring)"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ChartContainer>
  );
}

function MatchHistoryRow({
  sub,
  eventCode,
}: {
  sub: MatchSub;
  eventCode: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border px-4 py-2.5">
      <div className="flex items-center gap-3">
        <Link
          className="font-mono font-semibold text-sm hover:underline"
          href={`/analyse/${eventCode}/match/${sub.matchNumber}` as Route}
        >
          Q{sub.matchNumber}
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
      </div>
      <div className="flex items-center gap-3">
        <span className="font-mono text-xs">
          {scoringForMatch(sub)}
          <span className="ml-1 text-muted-foreground text-xs">
            {sub.inputMode === "form" ? "s" : "ev"}
          </span>
        </span>
        {climbBadgeVariant(sub.climbLevel)}
      </div>
    </div>
  );
}

function NotesSection({
  notes,
}: {
  notes: { matchNumber: number; note: string }[];
}) {
  if (notes.length === 0) {
    return null;
  }
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Scout Notes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {notes.map(({ matchNumber, note }) => (
            <div className="space-y-1" key={matchNumber}>
              <Badge className="text-xs" variant="outline">
                Q{matchNumber}
              </Badge>
              <p className="text-sm">{note}</p>
              <Separator />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// --- Main page ---

function useTeamMetrics(
  matchSubs: MatchSub[] | undefined,
  shootingSpeed?: number
) {
  const matchCount = matchSubs?.length ?? 0;
  const avgScoring =
    matchCount > 0 && matchSubs
      ? Math.round(
          (matchSubs.reduce((s, m) => s + scoringForMatch(m), 0) / matchCount) *
            10
        ) / 10
      : 0;
  const scoringPointValues =
    matchSubs?.map((m) => scoringPointsForMatch(m, shootingSpeed)) ?? [];
  const validScores = scoringPointValues.filter(
    (v): v is number => typeof v === "number"
  );
  const avgScoringPoints =
    validScores.length > 0
      ? Math.round(
          (validScores.reduce((a, b) => a + b, 0) / validScores.length) * 10
        ) / 10
      : null;
  return { matchCount, avgScoring, avgScoringPoints };
}

function TeamProfileBody({
  matchSubs,
  pitData,
  eventCode,
}: {
  matchSubs: MatchSub[];
  pitData: PitSub | null;
  eventCode: string;
}) {
  const shootingSpeed = pitData?.shootingSpeed;
  const { matchCount, avgScoring, avgScoringPoints } = useTeamMetrics(
    matchSubs,
    shootingSpeed
  );
  const scoringUnit = matchSubs[0]?.inputMode === "form" ? "s/match" : "match";
  const shootingSpeedDisplay =
    shootingSpeed === undefined ? "—" : String(shootingSpeed);
  const scoringPointsDisplay =
    avgScoringPoints === null ? "—" : String(avgScoringPoints);
  const allNotes = matchSubs
    .filter((s) => s.notes?.trim())
    .map((s) => ({ matchNumber: s.matchNumber, note: s.notes ?? "" }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch">
        <div className="min-w-0 shrink-0 lg:w-72 xl:w-80">
          <div className="h-full overflow-hidden rounded-lg border bg-card">
            <div className="border-primary border-l-4">
              <div className="border-b px-4 last:border-b-0">
                <MetricCard
                  icon={ClipboardList}
                  label="Matches Scouted"
                  value={matchCount}
                />
              </div>
              <div className="border-b px-4 last:border-b-0">
                <MetricCard
                  icon={Gauge}
                  label="Shooting Speed"
                  {...(typeof shootingSpeed === "number" ? { sub: "/s" } : {})}
                  value={shootingSpeedDisplay}
                />
              </div>
              <div className="border-b px-4 last:border-b-0">
                <MetricCard
                  icon={TrendingUp}
                  label="Avg Points"
                  {...(avgScoringPoints !== null ? { sub: "pts/match" } : {})}
                  value={scoringPointsDisplay}
                />
              </div>
              <div className="px-4">
                <MetricCard
                  icon={Target}
                  label="Avg Scoring Activity"
                  sub={scoringUnit}
                  value={avgScoring}
                />
              </div>
            </div>
          </div>
        </div>

        {pitData ? (
          <div className="min-w-0 flex-1">
            <PitCard pit={pitData} />
          </div>
        ) : null}
      </div>

      {matchSubs.length > 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <TrendingUp className="size-4 text-muted-foreground" />
              Avg Scoring by Period
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PerPeriodChart matchSubs={matchSubs} />
          </CardContent>
        </Card>
      ) : null}

      {matchSubs.length > 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Match History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {matchSubs.map((sub) => (
                <MatchHistoryRow
                  eventCode={eventCode}
                  key={sub._id}
                  sub={sub}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <span className="text-muted-foreground text-sm">
            No match submissions for this team at {eventCode}
          </span>
        </div>
      )}

      <NotesSection notes={allNotes} />
    </div>
  );
}

export default function TeamProfile() {
  const params = useParams<{ eventCode: string; teamNumber: string }>();
  const { eventCode, teamNumber: teamNumberStr } = params;
  const teamNumber = Number.parseInt(teamNumberStr, 10);

  const matchSubs = useQuery(api.analysis.getTeamMatchStats, {
    eventCode,
    teamNumber,
  }) as MatchSub[] | undefined;

  const pitData = useQuery(api.analysis.getTeamPitData, {
    eventCode,
    teamNumber,
  }) as PitSub | null | undefined;

  const teamsMap = useQuery(api.teams.getTeamsMapForEvent, { eventCode });
  const teamName =
    teamsMap && typeof teamsMap === "object" && "map" in teamsMap
      ? ((teamsMap.map as Record<string, string>)[String(teamNumber)] ?? null)
      : null;

  const isLoading = matchSubs === undefined || pitData === undefined;

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 sm:px-6">
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
          <span className="text-foreground">{teamNumber}</span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href={`/analyse/${eventCode}` as Route}>
              <Button size="icon" variant="ghost">
                <ArrowLeft className="size-4" />
              </Button>
            </Link>
            <div>
              <h1 className="font-mono font-semibold text-xl tracking-tight">
                Team {teamNumber}
                {teamName ? (
                  <span className="ml-2 font-normal font-sans text-base text-muted-foreground">
                    {teamName}
                  </span>
                ) : null}
              </h1>
              <p className="text-muted-foreground text-sm">{eventCode}</p>
            </div>
          </div>

          <Link
            href={
              `/analyse/${eventCode}/comparison?teams=${teamNumber}` as Route
            }
          >
            <Button size="sm" variant="outline">
              <GitCompareArrows className="mr-1.5 size-4" />
              Compare
            </Button>
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: PASS
              <Skeleton className="h-20 rounded-lg" key={i} />
            ))}
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : (
        <TeamProfileBody
          eventCode={eventCode}
          matchSubs={matchSubs ?? []}
          pitData={pitData ?? null}
        />
      )}
    </div>
  );
}
