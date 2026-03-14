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
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@decode/ui/components/dialog";
import { Separator } from "@decode/ui/components/separator";
import { Skeleton } from "@decode/ui/components/skeleton";
import { useQuery } from "convex/react";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Gauge,
  GitCompareArrows,
  ImageIcon,
  Target,
  TrendingUp,
  Wrench,
  XCircle,
} from "lucide-react";
import type { Route } from "next";
import NextImage from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  CHART_PERIODS,
  CLIMB_LABELS,
  PERIOD_LABELS,
  PERIOD_TO_PD_KEY,
  type PitSubBase,
} from "@/lib/analyse";

const periodChartConfig: ChartConfig = {
  scoring: {
    label: "Scoring",
    color: "hsl(var(--chart-1))",
  },
};

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

type PitSub = PitSubBase & {
  robotDimensions?: { length: number; width: number; height: number };
  shootingSpeed?: number;
  notes?: string;
  photoUrls?: string[];
  submissionCount?: number;
};

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

function PhotoPreview({
  photoUrls,
  renderTrigger,
}: {
  photoUrls: string[];
  renderTrigger: (onOpen: () => void) => React.ReactNode;
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const openLightbox = useCallback(() => {
    setLightboxIndex(0);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null);
  }, []);

  const goPrev = useCallback(() => {
    setLightboxIndex((i) =>
      i === null ? null : i === 0 ? photoUrls.length - 1 : i - 1
    );
  }, [photoUrls.length]);

  const goNext = useCallback(() => {
    setLightboxIndex((i) =>
      i === null ? null : i === photoUrls.length - 1 ? 0 : i + 1
    );
  }, [photoUrls.length]);

  useEffect(() => {
    if (lightboxIndex === null || photoUrls.length <= 1) {
      return;
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxIndex, photoUrls.length, goPrev, goNext]);

  if (photoUrls.length === 0) {
    return null;
  }

  return (
    <>
      {renderTrigger(openLightbox)}

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            closeLightbox();
          }
        }}
        open={lightboxIndex !== null}
      >
        <DialogContent
          className="max-h-[90vh] max-w-4xl gap-0 overflow-hidden border bg-background p-0"
          showCloseButton={false}
        >
          <DialogTitle className="sr-only">Photos</DialogTitle>
          <div className="relative flex min-h-[50vh] items-center justify-center bg-muted/30 p-6">
            {lightboxIndex !== null ? (
              <>
                <NextImage
                  alt="Robot from pit scouting"
                  className="max-h-[75vh] max-w-full object-contain"
                  height={720}
                  src={photoUrls[lightboxIndex]}
                  width={1280}
                />
                {photoUrls.length > 1 ? (
                  <>
                    <button
                      aria-label="Previous photo"
                      className="absolute inset-y-0 left-0 w-1/2 cursor-pointer"
                      onClick={goPrev}
                      type="button"
                    />
                    <button
                      aria-label="Next photo"
                      className="absolute inset-y-0 right-0 w-1/2 cursor-pointer"
                      onClick={goNext}
                      type="button"
                    />
                  </>
                ) : null}
              </>
            ) : null}
          </div>
          {photoUrls.length > 1 ? (
            <div className="border-t px-4 py-2 text-center">
              <span className="text-muted-foreground text-xs">
                {lightboxIndex !== null ? lightboxIndex + 1 : 0} /{" "}
                {photoUrls.length}
              </span>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Pit card has multiple conditional sections
function PitCard({ pit }: { pit: PitSub }) {
  const intakeMethods = pit.intakeMethods ?? [];
  const metrics = [
    pit.drivetrainType && { label: "Drivetrain", value: pit.drivetrainType },
    pit.weight !== undefined && { label: "Weight", value: `${pit.weight} kg` },
    pit.hopperCapacity !== undefined && {
      label: "Hopper",
      value: String(pit.hopperCapacity),
    },
    pit.shootingSpeed !== undefined && {
      label: "Shooting",
      value: `${pit.shootingSpeed}/s`,
    },
    pit.maxClimbLevel !== undefined && {
      label: "Max climb",
      value: climbBadgeVariant(pit.maxClimbLevel),
    },
    pit.robotDimensions && {
      label: "Dimensions",
      value: `${pit.robotDimensions.length} × ${pit.robotDimensions.width} × ${pit.robotDimensions.height} cm`,
    },
  ].filter(Boolean) as { label: string; value: React.ReactNode }[];

  const hasCapabilities =
    intakeMethods.length > 0 ||
    pit.canPassTrench !== undefined ||
    pit.canCrossBump !== undefined;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border bg-card">
      <div className="flex flex-1 flex-col gap-0">
        <div className="border-b px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Wrench className="size-5 text-muted-foreground" />
              </div>
              <div>
                <span className="font-semibold text-sm">Pit Data</span>
                {typeof pit.submissionCount === "number" &&
                pit.submissionCount > 1 ? (
                  <span className="ml-2 text-muted-foreground text-xs">
                    (avg of {pit.submissionCount} submissions)
                  </span>
                ) : null}
              </div>
            </div>
            {Array.isArray(pit.photoUrls) && pit.photoUrls.length > 0 ? (
              <PhotoPreview
                photoUrls={pit.photoUrls}
                renderTrigger={(onOpen) => (
                  <Button
                    onClick={onOpen}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <ImageIcon className="mr-1.5 size-4" />
                    View photos ({pit.photoUrls?.length ?? 0})
                  </Button>
                )}
              />
            ) : null}
          </div>
        </div>

        {metrics.length > 0 ? (
          <div className="grid flex-1 grid-cols-2 gap-x-6 gap-y-0 border-b px-4 py-3 sm:grid-cols-3">
            {metrics.map((m) => (
              <div className="py-1" key={m.label}>
                <span className="block text-muted-foreground text-xs">
                  {m.label}
                </span>
                <span className="font-medium text-sm">{m.value}</span>
              </div>
            ))}
          </div>
        ) : null}

        {hasCapabilities ? (
          <div className="border-b px-4 py-3">
            <span className="block text-muted-foreground text-xs">
              Capabilities
            </span>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
              {intakeMethods.length > 0 && (
                <span className="flex gap-1.5">
                  {intakeMethods.map((m: string) => (
                    <Badge
                      className="text-xs capitalize"
                      key={m}
                      variant="outline"
                    >
                      {m}
                    </Badge>
                  ))}
                </span>
              )}
              <span className="flex items-center gap-1 text-sm">
                {pit.canPassTrench ? (
                  <CheckCircle2 className="size-3.5 text-green-500" />
                ) : (
                  <XCircle className="size-3.5 text-muted-foreground/50" />
                )}
                Trench
              </span>
              <span className="flex items-center gap-1 text-sm">
                {pit.canCrossBump ? (
                  <CheckCircle2 className="size-3.5 text-green-500" />
                ) : (
                  <XCircle className="size-3.5 text-muted-foreground/50" />
                )}
                Bump
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
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
  pitData,
}: {
  notes: { matchNumber: number; note: string }[];
  pitData: PitSub | null;
}) {
  const hasPitNotes = !!(pitData?.autoCapabilities || pitData?.notes);
  const hasMatchNotes = notes.length > 0;
  const showPitNotes = hasPitNotes && pitData !== null;

  if (!(hasPitNotes || hasMatchNotes)) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <ClipboardList className="size-4 text-muted-foreground" />
          Notes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {showPitNotes ? (
          <div className="space-y-4">
            {pitData.autoCapabilities ? (
              <div>
                <span className="block text-muted-foreground text-xs">
                  Auto
                </span>
                <p className="mt-1 text-sm leading-relaxed">
                  {pitData.autoCapabilities}
                </p>
              </div>
            ) : null}
            {pitData.notes ? (
              <div>
                <span className="block text-muted-foreground text-xs">
                  Pit Notes
                </span>
                <p className="mt-1 text-sm leading-relaxed">{pitData.notes}</p>
              </div>
            ) : null}
          </div>
        ) : null}

        {hasMatchNotes ? (
          <div>
            <span className="block text-muted-foreground text-xs">
              Match Scout Notes
            </span>
            <div className="mt-2 space-y-3">
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
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

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

        <div className="min-w-0 flex-1">
          {pitData ? (
            <PitCard pit={pitData} />
          ) : (
            <div className="flex h-full flex-col overflow-hidden rounded-lg border bg-card">
              <div className="border-b px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Wrench className="size-5 text-muted-foreground" />
                  </div>
                  <span className="font-semibold text-sm">Pit Data</span>
                </div>
              </div>
              <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-8 text-center">
                <p className="text-muted-foreground text-sm">
                  No pit scouting data submitted for this team yet.
                </p>
                <p className="text-muted-foreground text-xs">
                  Submit pit data to see robot specs, photos and notes here.
                </p>
              </div>
            </div>
          )}
        </div>
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

      <NotesSection notes={allNotes} pitData={pitData} />
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

  const pitData = useQuery(api.analysis.getTeamPitDataAggregated, {
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
