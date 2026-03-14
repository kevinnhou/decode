"use client";

import { api } from "@decode/backend/convex/_generated/api";
import { Badge } from "@decode/ui/components/badge";
import { Button } from "@decode/ui/components/button";
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
  ArrowUpDown,
  BarChart3,
  ClipboardList,
  GitCompareArrows,
  Wrench,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

type SortField = "rank" | "team" | "matches" | "scoring" | "defense";
type SortDir = "asc" | "desc";

type TeamAggregate = {
  teamNumber: number;
  rank: number;
  matchCount: number;
  pitCount: number;
  avgScoringActivity: number;
  avgDefenseActivity: number;
  primaryInputMode: "form" | "field";
};

function TeamRow({
  team,
  eventCode,
  isSelected,
  onToggle,
}: {
  team: TeamAggregate;
  eventCode: string;
  isSelected: boolean;
  onToggle: (n: number) => void;
}) {
  const unit = team.primaryInputMode === "form" ? "s" : "ev";
  const hasMatchData = team.matchCount > 0;
  return (
    <TableRow className={isSelected ? "bg-muted/40" : ""}>
      <TableCell className="font-mono text-muted-foreground text-xs">
        {team.rank}
      </TableCell>
      <TableCell>
        <Link
          className="font-mono font-semibold text-sm hover:underline"
          href={`/analyse/${eventCode}/teams/${team.teamNumber}` as Route}
        >
          {team.teamNumber}
        </Link>
      </TableCell>
      <TableCell className="text-right text-sm">{team.matchCount}</TableCell>
      <TableCell className="text-right text-sm">
        {team.pitCount > 0 ? (
          <Badge
            className="inline-flex items-center gap-1 text-xs"
            title={`${team.pitCount} pit submission${team.pitCount !== 1 ? "s" : ""}`}
            variant="secondary"
          >
            <Wrench className="size-3" />
            {team.pitCount}
          </Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="text-right font-mono text-sm">
        {hasMatchData ? (
          <>
            {team.avgScoringActivity}
            <span className="ml-1 text-muted-foreground text-xs">{unit}</span>
          </>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="text-right font-mono text-sm">
        {hasMatchData ? (
          <>
            {team.avgDefenseActivity}
            <span className="ml-1 text-muted-foreground text-xs">{unit}</span>
          </>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        <button
          className={`rounded px-2 py-1 text-xs transition-colors ${
            isSelected
              ? "bg-primary text-primary-foreground"
              : "border hover:bg-muted"
          }`}
          onClick={() => onToggle(team.teamNumber)}
          type="button"
        >
          {isSelected ? "✓" : "+"}
        </button>
      </TableCell>
    </TableRow>
  );
}

export default function EventDashboard() {
  const params = useParams<{ eventCode: string }>();
  const eventCode = params.eventCode;
  const router = useRouter();

  const [sortField, setSortField] = useState<SortField>("rank");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selectedTeams, setSelectedTeams] = useState<Set<number>>(new Set());

  const aggregates = useQuery(api.analysis.getEventAggregates, {
    eventCode,
  });
  const submissionCounts = useQuery(api.analysis.getEventSubmissionCounts, {
    eventCode,
  });

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "rank" || field === "team" ? "asc" : "desc");
    }
  }

  function toggleTeam(teamNumber: number) {
    setSelectedTeams((prev) => {
      const next = new Set(prev);
      if (next.has(teamNumber)) {
        next.delete(teamNumber);
      } else if (next.size < 6) {
        next.add(teamNumber);
      }
      return next;
    });
  }

  function handleCompare() {
    if (selectedTeams.size < 2) {
      return;
    }
    const teamParam = Array.from(selectedTeams).join(",");
    router.push(`/analyse/${eventCode}/comparison?teams=${teamParam}` as Route);
  }

  const sorted = [...(aggregates ?? [])].sort(
    (a: TeamAggregate, b: TeamAggregate) => {
      const fieldMap: Record<SortField, number> = {
        rank: a.rank - b.rank,
        team: a.teamNumber - b.teamNumber,
        matches: a.matchCount - b.matchCount,
        scoring: a.avgScoringActivity - b.avgScoringActivity,
        defense: a.avgDefenseActivity - b.avgDefenseActivity,
      };
      const diff = fieldMap[sortField];
      return sortDir === "asc" ? diff : -diff;
    }
  );

  const SortButton = ({
    field,
    children,
  }: {
    field: SortField;
    children: React.ReactNode;
  }) => (
    <button
      className="flex items-center gap-1 hover:text-foreground"
      onClick={() => toggleSort(field)}
      type="button"
    >
      {children}
      <ArrowUpDown
        className={`size-3 ${sortField === field ? "text-foreground" : "text-muted-foreground/50"}`}
      />
    </button>
  );

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-col gap-4">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Link className="hover:text-foreground" href={"/analyse" as Route}>
            Analyse
          </Link>
          <span>/</span>
          <span className="text-foreground">{eventCode}</span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href={"/analyse" as Route}>
              <Button size="icon" variant="ghost">
                <ArrowLeft className="size-4" />
              </Button>
            </Link>
            <div>
              <h1 className="font-semibold text-xl tracking-tight">
                {eventCode}
              </h1>
              <p className="text-muted-foreground text-sm">
                Event Dashboard
                {submissionCounts ? (
                  <span className="ml-2 inline-flex items-center gap-2">
                    <span className="inline-flex items-center gap-1">
                      <ClipboardList className="size-3.5" />
                      {submissionCounts.matchCount} match
                      {submissionCounts.matchCount !== 1 ? "es" : ""}
                    </span>
                    <span className="text-muted-foreground/60">•</span>
                    <span className="inline-flex items-center gap-1">
                      <Wrench className="size-3.5" />
                      {submissionCounts.pitCount} pit
                      {submissionCounts.pitCount !== 1 ? "s" : ""}
                    </span>
                  </span>
                ) : null}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedTeams.size > 0 ? (
              <Button
                disabled={selectedTeams.size < 2}
                onClick={handleCompare}
                size="sm"
                variant="default"
              >
                <GitCompareArrows className="mr-1.5 size-4" />
                Compare {selectedTeams.size} team
                {selectedTeams.size !== 1 ? "s" : ""}
              </Button>
            ) : null}

            <Link href={`/analyse/${eventCode}/comparison` as Route}>
              <Button size="sm" variant="outline">
                <GitCompareArrows className="mr-1.5 size-4" />
                Compare
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {aggregates === undefined ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: PASS
            <Skeleton className="h-12 w-full rounded-lg" key={i} />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <BarChart3 className="size-10 text-muted-foreground/50" />
          <div className="flex flex-col gap-1">
            <p className="font-medium text-sm">No data yet</p>
            <p className="text-muted-foreground text-sm">
              Submit FRC match or pit scouting data for this event to see teams.
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow className="text-muted-foreground text-xs">
                <TableHead className="w-12">
                  <SortButton field="rank">#</SortButton>
                </TableHead>
                <TableHead>
                  <SortButton field="team">Team</SortButton>
                </TableHead>
                <TableHead className="text-right">
                  <SortButton field="matches">Matches</SortButton>
                </TableHead>
                <TableHead className="text-right">Pit</TableHead>
                <TableHead className="text-right">
                  <SortButton field="scoring">Avg Scoring</SortButton>
                </TableHead>
                <TableHead className="text-right">
                  <SortButton field="defense">Avg Defense</SortButton>
                </TableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((team: TeamAggregate) => (
                <TeamRow
                  eventCode={eventCode}
                  isSelected={selectedTeams.has(team.teamNumber)}
                  key={team.teamNumber}
                  onToggle={toggleTeam}
                  team={team}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
