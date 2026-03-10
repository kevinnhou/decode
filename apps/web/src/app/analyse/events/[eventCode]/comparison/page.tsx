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
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@decode/ui/components/chart";
import { Input } from "@decode/ui/components/input";
import { Skeleton } from "@decode/ui/components/skeleton";
import { useQuery } from "convex/react";
import { ArrowLeft, CheckCircle2, Plus, X, XCircle } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

// --- Types ---

type PitSub = {
  drivetrainType?: string;
  weight?: number;
  hopperCapacity?: number;
  maxClimbLevel?: number;
  intakeMethods?: string[];
  canPassTrench?: boolean;
  canCrossBump?: boolean;
  autoCapabilities?: string;
};

type TeamComparisonData = {
  teamNumber: number;
  matchCount: number;
  climbSuccessRate: number;
  avgClimbLevel: number;
  avgClimbDuration: number;
  avgScoringActivity: number;
  avgDefenseActivity: number;
  primaryInputMode: "form" | "field";
  avgPerPeriodScoring: Record<string, number>;
  pitSubmission: PitSub | null;
};

// --- Chart colours for up to 6 teams ---

const TEAM_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(221 83% 53%)",
];

const PERIOD_LABELS: Record<string, string> = {
  AUTO: "Auto",
  TRANSITION: "Trans.",
  SHIFT_1: "S1",
  SHIFT_2: "S2",
  SHIFT_3: "S3",
  SHIFT_4: "S4",
  END_GAME: "End",
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

// --- Helpers ---

function parseTeamsParam(raw: string | null): number[] {
  if (!raw) {
    return [];
  }
  return raw
    .split(",")
    .map((s) => Number.parseInt(s.trim(), 10))
    .filter((n) => !Number.isNaN(n) && n > 0);
}

function buildChartConfig(teamNumbers: number[]): ChartConfig {
  const config: ChartConfig = {};
  for (let i = 0; i < teamNumbers.length; i += 1) {
    config[String(teamNumbers[i])] = {
      label: `Team ${teamNumbers[i]}`,
      color: TEAM_COLORS[i] ?? TEAM_COLORS[0],
    };
  }
  return config;
}

function buildPeriodChartData(teams: TeamComparisonData[]) {
  return CHART_PERIODS.map((period) => {
    const entry: Record<string, string | number> = {
      period: PERIOD_LABELS[period] ?? period,
    };
    for (const team of teams) {
      entry[String(team.teamNumber)] = team.avgPerPeriodScoring[period] ?? 0;
    }
    return entry;
  });
}

// --- Sub-components ---

function MetricRow({
  label,
  values,
}: {
  label: string;
  values: { teamNumber: number; value: string | number }[];
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3">
      <span className="text-muted-foreground text-xs">{label}</span>
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${values.length}, 1fr)` }}
      >
        {values.map(({ teamNumber, value }) => (
          <div className="flex flex-col items-center" key={teamNumber}>
            <span className="font-mono font-semibold text-sm">{value}</span>
            <span className="text-muted-foreground text-xs">{teamNumber}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PitComparisonTable({ teams }: { teams: TeamComparisonData[] }) {
  const pits = teams.map((t) => ({
    teamNumber: t.teamNumber,
    pit: t.pitSubmission,
  }));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Pit Capabilities</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pr-4 pb-2 font-normal text-muted-foreground text-xs">
                  Metric
                </th>
                {teams.map((t) => (
                  <th
                    className="pr-4 pb-2 font-mono font-semibold text-xs"
                    key={t.teamNumber}
                  >
                    {t.teamNumber}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="[&>tr]:border-b [&>tr]:last:border-0">
              <PitRow
                field="drivetrainType"
                label="Drivetrain"
                teams={pits}
                type="text"
              />
              <PitRow
                field="weight"
                label="Weight (kg)"
                teams={pits}
                type="number"
              />
              <PitRow
                field="hopperCapacity"
                label="Hopper Cap."
                teams={pits}
                type="number"
              />
              <PitRow
                field="maxClimbLevel"
                label="Max Climb"
                teams={pits}
                type="climb"
              />
              <PitRow
                field="canPassTrench"
                label="Trench"
                teams={pits}
                type="bool"
              />
              <PitRow
                field="canCrossBump"
                label="Bump"
                teams={pits}
                type="bool"
              />
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function PitRow({
  label,
  teams,
  field,
  type,
}: {
  label: string;
  teams: { teamNumber: number; pit: PitSub | null }[];
  field: keyof PitSub;
  type: "text" | "number" | "bool" | "climb";
}) {
  return (
    <tr>
      <td className="py-2 pr-4 text-muted-foreground text-xs">{label}</td>
      {teams.map(({ teamNumber, pit }) => {
        const val = pit?.[field];
        return (
          <td className="py-2 pr-4 text-xs" key={teamNumber}>
            {type === "bool" ? (
              val ? (
                <CheckCircle2 className="size-3.5 text-green-500" />
              ) : (
                <XCircle className="size-3.5 text-muted-foreground/40" />
              )
            ) : type === "climb" ? (
              <span>{CLIMB_LABELS[val as number] ?? "—"}</span>
            ) : (
              <span className="capitalize">
                {val !== undefined ? String(val) : "—"}
              </span>
            )}
          </td>
        );
      })}
    </tr>
  );
}

function TeamSelector({
  teams,
  onAdd,
  onRemove,
  eventCode,
}: {
  teams: number[];
  onAdd: (n: number) => void;
  onRemove: (n: number) => void;
  eventCode: string;
}) {
  const [input, setInput] = useState("");

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const n = Number.parseInt(input.trim(), 10);
    if (!Number.isNaN(n) && n > 0 && !teams.includes(n) && teams.length < 6) {
      onAdd(n);
      setInput("");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {teams.map((n, i) => (
        <div
          className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs"
          key={n}
          style={{ borderColor: TEAM_COLORS[i] }}
        >
          <span
            className="size-2 rounded-full"
            style={{ backgroundColor: TEAM_COLORS[i] }}
          />
          <span className="font-mono font-semibold">{n}</span>
          <Link
            className="text-muted-foreground text-xs hover:text-foreground"
            href={`/analyse/events/${eventCode}/teams/${n}` as Route}
          >
            ↗
          </Link>
          <button
            className="text-muted-foreground hover:text-foreground"
            onClick={() => onRemove(n)}
            type="button"
          >
            <X className="size-3" />
          </button>
        </div>
      ))}
      {teams.length < 6 ? (
        <form className="flex items-center gap-1" onSubmit={handleAdd}>
          <Input
            className="h-7 w-24 text-xs"
            min={1}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Add team"
            type="number"
            value={input}
          />
          <Button
            className="size-7"
            disabled={input.length === 0}
            size="icon"
            type="submit"
            variant="outline"
          >
            <Plus className="size-3" />
          </Button>
        </form>
      ) : null}
    </div>
  );
}

function TeamPitCard({
  team,
  eventCode,
  colorIndex,
}: {
  team: TeamComparisonData;
  eventCode: string;
  colorIndex: number;
}) {
  const intakeMethods = team.pitSubmission?.intakeMethods ?? [];
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <span
            className="size-2.5 rounded-full"
            style={{ backgroundColor: TEAM_COLORS[colorIndex] }}
          />
          <Link
            className="font-mono hover:underline"
            href={
              `/analyse/events/${eventCode}/teams/${team.teamNumber}` as Route
            }
          >
            Team {team.teamNumber}
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {team.pitSubmission ? (
          <>
            {team.pitSubmission.drivetrainType ? (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs">
                  Drivetrain
                </span>
                <span className="text-xs capitalize">
                  {team.pitSubmission.drivetrainType}
                </span>
              </div>
            ) : null}
            {intakeMethods.length > 0 ? (
              <div className="flex items-start justify-between gap-2">
                <span className="text-muted-foreground text-xs">Intake</span>
                <div className="flex flex-wrap justify-end gap-1">
                  {intakeMethods.map((m) => (
                    <Badge
                      className="text-[10px] capitalize"
                      key={m}
                      variant="outline"
                    >
                      {m}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
            {team.pitSubmission.autoCapabilities ? (
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs">Auto</span>
                <p className="text-xs">{team.pitSubmission.autoCapabilities}</p>
              </div>
            ) : null}
          </>
        ) : (
          <span className="text-muted-foreground text-xs">No pit data</span>
        )}
      </CardContent>
    </Card>
  );
}

// --- Main page ---

export default function ComparisonBoard() {
  const params = useParams<{ eventCode: string }>();
  const { eventCode } = params;
  const searchParams = useSearchParams();

  const [teamNumbers, setTeamNumbers] = useState<number[]>(() =>
    parseTeamsParam(searchParams.get("teams"))
  );

  const addTeam = useCallback((n: number) => {
    setTeamNumbers((prev) =>
      prev.includes(n) || prev.length >= 6 ? prev : [...prev, n]
    );
  }, []);

  const removeTeam = useCallback((n: number) => {
    setTeamNumbers((prev) => prev.filter((t) => t !== n));
  }, []);

  const comparisonData = useQuery(
    api.analysis.getComparisonData,
    teamNumbers.length > 0 ? { eventCode, teamNumbers } : "skip"
  ) as TeamComparisonData[] | undefined;

  const isLoading = teamNumbers.length > 0 && comparisonData === undefined;
  const teams = comparisonData ?? [];
  const chartConfig = buildChartConfig(teamNumbers);
  const periodData = buildPeriodChartData(teams);
  const hasAnyData = teams.some((t) => t.matchCount > 0);

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-col gap-4">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Link className="hover:text-foreground" href={"/analyse" as Route}>
            Analyse
          </Link>
          <span>/</span>
          <Link
            className="hover:text-foreground"
            href={`/analyse/events/${eventCode}` as Route}
          >
            {eventCode}
          </Link>
          <span>/</span>
          <span className="text-foreground">Comparison</span>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <Link href={`/analyse/events/${eventCode}` as Route}>
            <Button size="icon" variant="ghost">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <h1 className="font-semibold text-xl tracking-tight">
              Team Comparison
            </h1>
            <p className="text-muted-foreground text-sm">{eventCode}</p>
          </div>
        </div>

        <TeamSelector
          eventCode={eventCode}
          onAdd={addTeam}
          onRemove={removeTeam}
          teams={teamNumbers}
        />
      </div>

      {teamNumbers.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <p className="font-medium text-sm">No teams selected</p>
          <p className="text-muted-foreground text-sm">
            Add team numbers above to compare them side by side.
          </p>
        </div>
      ) : isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: PASS
            <Skeleton className="h-32 rounded-xl" key={i} />
          ))}
        </div>
      ) : hasAnyData ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <MetricRow
              label="Matches Scouted"
              values={teams.map((t) => ({
                teamNumber: t.teamNumber,
                value: t.matchCount,
              }))}
            />
            <MetricRow
              label="Climb Success Rate"
              values={teams.map((t) => ({
                teamNumber: t.teamNumber,
                value: `${t.climbSuccessRate}%`,
              }))}
            />
            <MetricRow
              label="Avg Climb Level"
              values={teams.map((t) => ({
                teamNumber: t.teamNumber,
                value: t.avgClimbLevel,
              }))}
            />
            <MetricRow
              label="Avg Scoring Activity"
              values={teams.map((t) => ({
                teamNumber: t.teamNumber,
                value: `${t.avgScoringActivity}${t.primaryInputMode === "form" ? "s" : "ev"}`,
              }))}
            />
            <MetricRow
              label="Avg Defense Activity"
              values={teams.map((t) => ({
                teamNumber: t.teamNumber,
                value: `${t.avgDefenseActivity}${t.primaryInputMode === "form" ? "s" : "ev"}`,
              }))}
            />
          </div>

          {teams.some((t) =>
            Object.values(t.avgPerPeriodScoring).some((v) => v > 0)
          ) ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Avg Scoring by Period</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer className="h-56 w-full" config={chartConfig}>
                  <BarChart data={periodData}>
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
                    <ChartLegend content={<ChartLegendContent />} />
                    {teamNumbers.map((n, i) => (
                      <Bar
                        dataKey={String(n)}
                        fill={TEAM_COLORS[i] ?? TEAM_COLORS[0]}
                        key={n}
                        radius={[3, 3, 0, 0]}
                      />
                    ))}
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {teams.map((team, i) => (
              <TeamPitCard
                colorIndex={i}
                eventCode={eventCode}
                key={team.teamNumber}
                team={team}
              />
            ))}
          </div>

          <PitComparisonTable teams={teams} />
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <p className="text-muted-foreground text-sm">
            No scouting data found for the selected teams at {eventCode}.
          </p>
        </div>
      )}
    </div>
  );
}
