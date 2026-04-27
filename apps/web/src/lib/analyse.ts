import type { ChartConfig } from "@decode/ui/components/chart";

export const CHART_PERIODS = [
  "AUTO",
  "TRANSITION",
  "SHIFT_1",
  "SHIFT_2",
  "SHIFT_3",
  "SHIFT_4",
  "END_GAME",
] as const;

export const CLIMB_LABELS: Record<number, string> = {
  0: "No climb",
  1: "Level 1",
  2: "Level 2",
  3: "Level 3",
};

export const PERIOD_LABELS_SHORT: Record<string, string> = {
  AUTO: "Auto",
  TRANSITION: "Trans.",
  SHIFT_1: "S1",
  SHIFT_2: "S2",
  SHIFT_3: "S3",
  SHIFT_4: "S4",
  END_GAME: "End",
};

export const PERIOD_LABELS: Record<string, string> = {
  AUTO: "Auto",
  TRANSITION: "Trans.",
  SHIFT_1: "Shift 1",
  SHIFT_2: "Shift 2",
  SHIFT_3: "Shift 3",
  SHIFT_4: "Shift 4",
  END_GAME: "End",
};

export const PERIOD_TO_PD_KEY: Record<string, string> = {
  AUTO: "auto",
  TRANSITION: "transition",
  SHIFT_1: "shift1",
  SHIFT_2: "shift2",
  SHIFT_3: "shift3",
  SHIFT_4: "shift4",
  END_GAME: "endGame",
};

export const TEAM_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(221 83% 53%)",
];

export type SortField = "rank" | "team" | "matches" | "scoring" | "defense";
export type SortDir = "asc" | "desc";

export type TeamAggregate = {
  teamNumber: number;
  rank: number;
  matchCount: number;
  pitCount: number;
  avgScoringActivity: number;
  avgDefenseActivity: number;
  primaryInputMode: "form" | "field";
};

export type PitSubBase = {
  drivetrainType?: string;
  weight?: number;
  hopperCapacity?: number;
  maxClimbLevel?: number;
  intakeMethods?: string[];
  canPassTrench?: boolean;
  canCrossBump?: boolean;
  canShootDeep?: boolean;
  autoCapabilities?: string;
};

export type AnalyseCompetitionType = "FRC" | "FTC";

export const FTC_CHART_PERIODS = ["AUTO", "TELEOP"] as const;

export const FTC_PERIOD_LABELS_SHORT: Record<string, string> = {
  AUTO: "Auto",
  TELEOP: "Teleop",
};

export function parseAnalyseCompetitionType(
  raw: string | null | undefined
): AnalyseCompetitionType {
  return raw === "FTC" ? "FTC" : "FRC";
}

/** Appends `competitionType=FTC` when viewing FTC events; FRC URLs stay unqualified. */
export function withAnalyseCompetition(
  pathname: string,
  competitionType: AnalyseCompetitionType
): string {
  if (competitionType !== "FTC") {
    return pathname;
  }
  return pathname.includes("?")
    ? `${pathname}&competitionType=FTC`
    : `${pathname}?competitionType=FTC`;
}

export function parseTeamsParam(raw: string | null): number[] {
  if (!raw) {
    return [];
  }
  return raw
    .split(",")
    .map((s) => Number.parseInt(s.trim(), 10))
    .filter((n) => !Number.isNaN(n) && n > 0);
}

export function buildChartConfig(teamNumbers: number[]): ChartConfig {
  const config: ChartConfig = {};
  for (let i = 0; i < teamNumbers.length; i += 1) {
    config[String(teamNumbers[i])] = {
      label: `Team ${teamNumbers[i]}`,
      color: TEAM_COLORS[i] ?? TEAM_COLORS[0],
    };
  }
  return config;
}

export function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) {
    return `${s}s`;
  }
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}
