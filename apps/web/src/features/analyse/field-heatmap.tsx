"use client";

import { api } from "@decode/backend/convex/_generated/api";
import { Button } from "@decode/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@decode/ui/components/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@decode/ui/components/select";
import { useQuery } from "convex/react";
import { MapPin } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import {
  type AnalyseCompetitionType,
  PERIOD_LABELS,
  withAnalyseCompetition,
} from "@/lib/analyse";

type HeatmapPeriodFilter =
  | "all"
  | "AUTO"
  | "TRANSITION"
  | "SHIFT_1"
  | "SHIFT_2"
  | "SHIFT_3"
  | "SHIFT_4"
  | "END_GAME"
  | "TELEOP";

type HeatmapQueryResult = {
  gridCols: number;
  gridRows: number;
  bins: Array<{
    col: number;
    row: number;
    count: number;
    matchNumbers: number[];
  }>;
  maxCount: number;
  totalWeightedHits: number;
  hasFieldSpatialData: boolean;
  fieldSpatialMatchCount: number;
  periodFilter: HeatmapPeriodFilter;
};

const FTC_PERIOD_OPTIONS: { value: HeatmapPeriodFilter; label: string }[] = [
  { value: "all", label: "All periods" },
  { value: "AUTO", label: "Autonomous" },
  { value: "TELEOP", label: "Teleop" },
];

const FRC_PERIOD_OPTIONS: { value: HeatmapPeriodFilter; label: string }[] = [
  { value: "all", label: "All periods" },
  ...(
    [
      "AUTO",
      "TRANSITION",
      "SHIFT_1",
      "SHIFT_2",
      "SHIFT_3",
      "SHIFT_4",
      "END_GAME",
    ] as const
  ).map((p) => ({
    value: p,
    label: PERIOD_LABELS[p] ?? p,
  })),
];

function binKey(col: number, row: number) {
  return `${col},${row}`;
}

export function FieldHeatmapCard({
  eventCode,
  teamNumber,
  competitionType,
}: {
  eventCode: string;
  teamNumber: number;
  competitionType: AnalyseCompetitionType;
}) {
  const [periodFilter, setPeriodFilter] = useState<HeatmapPeriodFilter>("all");
  const [viewMode, setViewMode] = useState<"density" | "points">("density");
  const [selectedCell, setSelectedCell] = useState<{
    col: number;
    row: number;
    count: number;
    matchNumbers: number[];
  } | null>(null);

  const data = useQuery(api.analysis.getTeamFieldHeatmap, {
    eventCode,
    teamNumber,
    competitionType,
    periodFilter,
  }) as HeatmapQueryResult | undefined;

  const periodOptions =
    competitionType === "FTC" ? FTC_PERIOD_OPTIONS : FRC_PERIOD_OPTIONS;

  const binMap = useMemo(() => {
    const m = new Map<string, HeatmapQueryResult["bins"][number]>();
    if (!data?.bins) {
      return m;
    }
    for (const b of data.bins) {
      m.set(binKey(b.col, b.row), b);
    }
    return m;
  }, [data?.bins]);

  const handleCellActivate = useCallback(
    (col: number, row: number) => {
      const bin = binMap.get(binKey(col, row));
      if (!bin || bin.count <= 0) {
        setSelectedCell(null);
        return;
      }
      setSelectedCell(bin);
    },
    [binMap]
  );

  if (data === undefined) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <MapPin className="size-4 text-muted-foreground" />
            Field scoring map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-40 items-center justify-center text-muted-foreground text-sm">
            Loading…
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data.hasFieldSpatialData) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <MapPin className="size-4 text-muted-foreground" />
            Field scoring map
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-muted-foreground text-sm">
            No field submissions with map data yet. Heat maps only use taps that
            include field coordinates; form-only matches still appear in the
            charts above.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { gridCols, gridRows, maxCount, bins } = data;
  const showEmptyFilter = bins.length === 0 || data.totalWeightedHits === 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <MapPin className="size-4 text-muted-foreground" />
            Field scoring map
            <span className="font-normal text-muted-foreground text-xs">
              ({data.fieldSpatialMatchCount} match
              {data.fieldSpatialMatchCount !== 1 ? "es" : ""} with map data)
            </span>
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs">Period</span>
              <Select
                onValueChange={(value: string) => {
                  setPeriodFilter(value as HeatmapPeriodFilter);
                  setSelectedCell(null);
                }}
                value={periodFilter}
              >
                <SelectTrigger className="h-8 w-[min(100%,11rem)]" size="sm">
                  <SelectValue placeholder="Period" />
                </SelectTrigger>
                <SelectContent>
                  {periodOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex rounded-md border p-0.5">
              <Button
                className="h-7 px-2 text-xs"
                onClick={() => setViewMode("density")}
                size="sm"
                type="button"
                variant={viewMode === "density" ? "secondary" : "ghost"}
              >
                Density
              </Button>
              <Button
                className="h-7 px-2 text-xs"
                onClick={() => setViewMode("points")}
                size="sm"
                type="button"
                variant={viewMode === "points" ? "secondary" : "ghost"}
              >
                Points
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {showEmptyFilter ? (
          <p className="text-muted-foreground text-sm">
            No scoring taps in this period filter. Try &ldquo;All periods&rdquo;
            or another phase.
          </p>
        ) : null}

        <div className="relative w-full overflow-hidden rounded-lg border bg-muted/10">
          <Image
            alt={competitionType === "FTC" ? "FTC field" : "FRC field"}
            className="w-full select-none"
            height={800}
            priority={false}
            src={
              competitionType === "FTC" ? "/ftc-field.webp" : "/frc-field.webp"
            }
            width={1200}
          />

          <div
            className="pointer-events-none absolute inset-0 grid"
            style={{
              gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${gridRows}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: gridRows * gridCols }, (_, i) => {
              const col = i % gridCols;
              const row = Math.floor(i / gridCols);
              const bin = binMap.get(binKey(col, row));
              const count = bin?.count ?? 0;
              const intensity =
                maxCount > 0 ? Math.min(1, count / maxCount) : 0;
              const isSelected =
                selectedCell?.col === col && selectedCell.row === row;
              const bg =
                viewMode === "density"
                  ? `rgba(59, 130, 246, ${0.12 + intensity * 0.62})`
                  : "transparent";
              return (
                <div
                  className={`relative flex items-center justify-center ${isSelected ? "ring-1 ring-primary ring-inset" : ""}`}
                  key={binKey(col, row)}
                  style={{ backgroundColor: bg }}
                >
                  {viewMode === "points" && count > 0 ? (
                    <span
                      className="block rounded-full bg-primary/85 shadow-sm"
                      style={{
                        width: `${6 + Math.sqrt(count) * 4}px`,
                        height: `${6 + Math.sqrt(count) * 4}px`,
                      }}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>

          <div
            className="absolute inset-0 z-10 grid"
            style={{
              gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${gridRows}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: gridRows * gridCols }, (_, i) => {
              const col = i % gridCols;
              const row = Math.floor(i / gridCols);
              const bin = binMap.get(binKey(col, row));
              return (
                <button
                  aria-label={`Cell column ${col + 1}, row ${row + 1}${
                    bin?.count ? `, ${bin.count} hits` : ""
                  }`}
                  className="min-h-[10px] bg-transparent hover:bg-primary/15"
                  key={`hit-${binKey(col, row)}`}
                  onClick={() => handleCellActivate(col, row)}
                  type="button"
                />
              );
            })}
          </div>
        </div>

        {selectedCell !== null && selectedCell.count > 0 ? (
          <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
            <p className="mb-2 font-medium">
              Cell ({selectedCell.col + 1}, {selectedCell.row + 1}) —{" "}
              {selectedCell.count} weighted hit
              {selectedCell.count !== 1 ? "s" : ""}
            </p>
            <p className="mb-1 text-muted-foreground text-xs">Open match</p>
            <ul className="flex flex-wrap gap-2">
              {selectedCell.matchNumbers.map((mn) => (
                <li key={mn}>
                  <Link
                    className="font-mono text-primary text-xs hover:underline"
                    href={
                      withAnalyseCompetition(
                        `/analyse/${eventCode}/match/${mn}`,
                        competitionType
                      ) as Route
                    }
                  >
                    Q{mn}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
