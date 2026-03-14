"use client";

import { api } from "@decode/backend/convex/_generated/api";
import { Button } from "@decode/ui/components/button";
import { Card, CardContent } from "@decode/ui/components/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@decode/ui/components/chart";
import { Input } from "@decode/ui/components/input";
import { Skeleton } from "@decode/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@decode/ui/components/table";
import { useQuery } from "convex/react";
import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Plus,
  Target,
  TrendingUp,
  X,
  XCircle,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  buildChartConfig,
  CHART_PERIODS,
  PERIOD_LABELS_SHORT,
  type PitSubBase,
  parseTeamsParam,
  TEAM_COLORS,
} from "@/lib/analyse";

type TeamComparisonData = {
  teamNumber: number;
  matchCount: number;
  avgScoringActivity: number;
  avgDefenseActivity: number;
  primaryInputMode: "form" | "field";
  avgPerPeriodScoring: Record<string, number>;
  pitSubmission: PitSubBase | null;
};

function buildPeriodChartData(teams: TeamComparisonData[]) {
  return CHART_PERIODS.map((period) => {
    const entry: Record<string, string | number> = {
      period: PERIOD_LABELS_SHORT[period] ?? period,
    };
    for (const team of teams) {
      entry[String(team.teamNumber)] = team.avgPerPeriodScoring[period] ?? 0;
    }
    return entry;
  });
}

function getBestTeamIndices(
  teams: TeamComparisonData[],
  getValue: (t: TeamComparisonData) => number,
  higherIsBetter = true
): Set<number> {
  if (teams.length === 0) {
    return new Set();
  }
  const values = teams.map((t) => getValue(t));
  const extrema = higherIsBetter ? Math.max(...values) : Math.min(...values);
  const best = new Set<number>();
  for (let i = 0; i < values.length; i++) {
    if (values[i] === extrema) {
      best.add(i);
    }
  }
  return best;
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
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-3">
        {teams.map((n, i) => (
          <div
            className="flex items-center gap-2 rounded-lg border px-4 py-2"
            key={n}
            style={{ borderLeftWidth: 4, borderLeftColor: TEAM_COLORS[i] }}
          >
            <span
              className="size-2.5 rounded-full"
              style={{ backgroundColor: TEAM_COLORS[i] }}
            />
            <Link
              className="font-mono font-semibold hover:underline"
              href={`/analyse/${eventCode}/teams/${n}` as Route}
            >
              {n}
            </Link>
            <button
              className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() => onRemove(n)}
              type="button"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        {teams.length < 6 ? (
          <form className="flex items-center gap-2" onSubmit={handleAdd}>
            <Input
              className="h-9 w-28 text-sm"
              min={1}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Add team #"
              type="number"
              value={input}
            />
            <Button
              className="h-9 gap-1.5"
              disabled={input.length === 0}
              size="sm"
              type="submit"
              variant="outline"
            >
              <Plus className="size-4" />
              Add
            </Button>
          </form>
        ) : null}
        <Link href={`/analyse/${eventCode}` as Route}>
          <Button className="h-9" size="sm" variant="outline">
            Pick from event
          </Button>
        </Link>
      </div>
    </div>
  );
}

function MetricsComparisonTable({ teams }: { teams: TeamComparisonData[] }) {
  const unit = teams[0]?.primaryInputMode === "form" ? "s" : "ev";

  const matchBest = getBestTeamIndices(teams, (t) => t.matchCount);
  const scoringBest = getBestTeamIndices(teams, (t) => t.avgScoringActivity);
  const defenseBest = getBestTeamIndices(teams, (t) => t.avgDefenseActivity);

  return (
    <div className="rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead className="w-48 font-medium">Metric</TableHead>
            {teams.map((t, i) => (
              <TableHead
                className="text-center font-mono font-semibold"
                key={t.teamNumber}
              >
                <span
                  className="inline-flex items-center gap-1.5"
                  style={{ color: TEAM_COLORS[i] }}
                >
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: TEAM_COLORS[i] }}
                  />
                  {t.teamNumber}
                </span>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell className="text-muted-foreground text-sm">
              Matches Scouted
            </TableCell>
            {teams.map((t, i) => (
              <TableCell
                className={`text-center font-medium font-mono text-sm ${
                  matchBest.has(i) ? "bg-emerald-500/10" : ""
                }`}
                key={t.teamNumber}
              >
                {t.matchCount}
              </TableCell>
            ))}
          </TableRow>
          <TableRow>
            <TableCell className="text-muted-foreground text-sm">
              Avg Scoring Activity
            </TableCell>
            {teams.map((t, i) => (
              <TableCell
                className={`text-center font-medium font-mono text-sm ${
                  scoringBest.has(i) ? "bg-emerald-500/10" : ""
                }`}
                key={t.teamNumber}
              >
                {t.avgScoringActivity}
                <span className="ml-1 font-normal text-muted-foreground text-xs">
                  {unit}
                </span>
              </TableCell>
            ))}
          </TableRow>
          <TableRow>
            <TableCell className="text-muted-foreground text-sm">
              Avg Defense Activity
            </TableCell>
            {teams.map((t, i) => (
              <TableCell
                className={`text-center font-medium font-mono text-sm ${
                  defenseBest.has(i) ? "bg-emerald-500/10" : ""
                }`}
                key={t.teamNumber}
              >
                {t.avgDefenseActivity}
                <span className="ml-1 font-normal text-muted-foreground text-xs">
                  {unit}
                </span>
              </TableCell>
            ))}
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

function PitRow({
  label,
  teams,
  field,
  type,
}: {
  label: string;
  teams: { teamNumber: number; pit: PitSubBase | null }[];
  field: keyof PitSubBase;
  type: "text" | "number" | "bool";
}) {
  return (
    <TableRow>
      <TableCell className="py-2.5 text-muted-foreground text-sm">
        {label}
      </TableCell>
      {teams.map(({ teamNumber, pit }) => {
        const val = pit?.[field];
        return (
          <TableCell className="py-2.5 text-center text-sm" key={teamNumber}>
            {type === "bool" ? (
              val ? (
                <CheckCircle2 className="mx-auto size-4 text-emerald-500" />
              ) : (
                <XCircle className="mx-auto size-4 text-muted-foreground/40" />
              )
            ) : (
              <span className="capitalize">
                {val !== undefined ? String(val) : "—"}
              </span>
            )}
          </TableCell>
        );
      })}
    </TableRow>
  );
}

function PitComparisonTable({ teams }: { teams: TeamComparisonData[] }) {
  const pits = teams.map((t) => ({
    teamNumber: t.teamNumber,
    pit: t.pitSubmission,
  }));

  return (
    <div className="rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead className="w-40 font-medium">Pit Capability</TableHead>
            {teams.map((t, i) => (
              <TableHead
                className="text-center font-mono font-semibold"
                key={t.teamNumber}
              >
                <span
                  className="inline-flex items-center gap-1.5"
                  style={{ color: TEAM_COLORS[i] }}
                >
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: TEAM_COLORS[i] }}
                  />
                  {t.teamNumber}
                </span>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
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
            field="canPassTrench"
            label="Can Pass Trench"
            teams={pits}
            type="bool"
          />
          <PitRow
            field="canCrossBump"
            label="Can Cross Bump"
            teams={pits}
            type="bool"
          />
          <TableRow>
            <TableCell className="py-2.5 text-muted-foreground text-sm">
              Intake Methods
            </TableCell>
            {pits.map(({ teamNumber, pit }) => (
              <TableCell
                className="py-2.5 text-center text-sm"
                key={teamNumber}
              >
                {pit?.intakeMethods?.length ? (
                  <div className="flex flex-wrap justify-center gap-1">
                    {pit.intakeMethods.map((m) => (
                      <span
                        className="rounded bg-muted px-1.5 py-0.5 text-xs capitalize"
                        key={m}
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
            ))}
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

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
  const hasPeriodData = teams.some((t) =>
    Object.values(t.avgPerPeriodScoring).some((v) => v > 0)
  );

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-col gap-4">
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
          <span className="text-foreground">Comparison</span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href={`/analyse/${eventCode}` as Route}>
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
        </div>

        <TeamSelector
          eventCode={eventCode}
          onAdd={addTeam}
          onRemove={removeTeam}
          teams={teamNumbers}
        />
      </div>

      {teamNumbers.length === 0 ? (
        <div className="flex flex-col items-center gap-6 rounded-xl border bg-muted/20 py-24 text-center">
          <BarChart3 className="size-12 text-muted-foreground/50" />
          <div className="flex flex-col gap-1">
            <p className="font-medium text-sm">No teams selected</p>
            <p className="max-w-xs text-muted-foreground text-sm">
              Add team numbers above to compare match performance and pit data
              side by side.
            </p>
          </div>
        </div>
      ) : isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      ) : hasAnyData ? (
        <div className="space-y-8">
          <section>
            <div className="mb-3 flex items-center gap-2">
              <Target className="size-4 text-muted-foreground" />
              <h2 className="font-medium text-muted-foreground text-sm">
                Match Performance
              </h2>
            </div>
            <MetricsComparisonTable teams={teams} />
          </section>

          {hasPeriodData ? (
            <section>
              <div className="mb-3 flex items-center gap-2">
                <TrendingUp className="size-4 text-muted-foreground" />
                <h2 className="font-medium text-muted-foreground text-sm">
                  Avg Scoring by Period
                </h2>
              </div>
              <Card>
                <CardContent className="pt-6">
                  <ChartContainer className="h-64 w-full" config={chartConfig}>
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
                        width={36}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <ChartLegend content={<ChartLegendContent />} />
                      {teamNumbers.map((n, i) => (
                        <Bar
                          dataKey={String(n)}
                          fill={TEAM_COLORS[i] ?? TEAM_COLORS[0]}
                          key={n}
                          radius={[4, 4, 0, 0]}
                        />
                      ))}
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </section>
          ) : null}

          <section>
            <h2 className="mb-3 font-medium text-muted-foreground text-sm">
              Pit Capabilities
            </h2>
            <PitComparisonTable teams={teams} />
          </section>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-6 rounded-xl border bg-muted/20 py-24 text-center">
          <BarChart3 className="size-12 text-muted-foreground/50" />
          <p className="text-muted-foreground text-sm">
            No data found for the selected teams at {eventCode}.
          </p>
        </div>
      )}
    </div>
  );
}
