"use client";

import {
  buildFrcPeriodChartAverages,
  buildFtcPeriodChartAverages,
  type FrcFieldEvent,
  type FrcPeriodData,
} from "@decode/analytics";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@decode/ui/components/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  type AnalyseCompetitionType,
  FTC_PERIOD_LABELS_SHORT,
  PERIOD_LABELS,
} from "@/lib/analyse";

const periodChartConfig: ChartConfig = {
  scoring: {
    label: "Scoring",
    color: "hsl(var(--chart-1))",
  },
};

export type AnalyseMatchSubForPeriodChart = {
  inputMode: string;
  periodData?: Record<
    string,
    { scoring: number; feeding: number; defense: number }
  >;
  frcFieldEvents?: Array<{
    eventType: string;
    action?: string;
    period: string;
  }>;
  ftcPeriodData?: {
    auto: { made: number; missed: number };
    teleop: { made: number; missed: number };
  };
  autonomousMade?: number;
  teleopMade?: number;
  fieldEvents?: Array<{ event: string; count: number }>;
};

export function PerPeriodChart({
  matchSubs,
  competitionType,
}: {
  matchSubs: AnalyseMatchSubForPeriodChart[];
  competitionType: AnalyseCompetitionType;
}) {
  const data =
    competitionType === "FTC"
      ? buildFtcPeriodChartAverages(
          matchSubs as Parameters<typeof buildFtcPeriodChartAverages>[0]
        ).map((row) => ({
          period: FTC_PERIOD_LABELS_SHORT[row.periodKey] ?? row.periodKey,
          scoring: row.scoring,
        }))
      : buildFrcPeriodChartAverages(
          matchSubs as Array<{
            inputMode: string;
            periodData?: FrcPeriodData | null;
            frcFieldEvents?: FrcFieldEvent[] | null;
          }>
        ).map((row) => ({
          period: PERIOD_LABELS[row.periodKey] ?? row.periodKey,
          scoring: row.scoring,
        }));
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
