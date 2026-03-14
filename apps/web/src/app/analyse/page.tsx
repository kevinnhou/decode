"use client";

import { api } from "@decode/backend/convex/_generated/api";
import { Badge } from "@decode/ui/components/badge";
import { Button } from "@decode/ui/components/button";
import { Input } from "@decode/ui/components/input";
import { Skeleton } from "@decode/ui/components/skeleton";
import { useQuery } from "convex/react";
import {
  CalendarDays,
  ChartNoAxesGantt,
  ClipboardList,
  Search,
  Wrench,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

function EventCard({
  eventCode,
  eventName,
  matchCount,
  pitCount,
}: {
  eventCode: string;
  eventName?: string;
  matchCount: number;
  pitCount: number;
}) {
  return (
    <Link
      className="group flex flex-col gap-3 rounded-xl border bg-card p-5 transition-colors hover:bg-muted/50"
      href={`/analyse/${eventCode}` as Route}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <span className="font-mono font-semibold text-sm">{eventCode}</span>
          {eventName ? (
            <span className="text-muted-foreground text-xs">{eventName}</span>
          ) : null}
        </div>
        <Badge className="shrink-0" variant="outline">
          FRC
        </Badge>
      </div>
      <div className="flex items-center gap-4 text-muted-foreground text-xs">
        <span className="flex items-center gap-1.5">
          <ClipboardList className="size-3.5" />
          {matchCount} match{matchCount !== 1 ? "es" : ""}
        </span>
        <span className="flex items-center gap-1.5">
          <Wrench className="size-3.5" />
          {pitCount} pit{pitCount !== 1 ? "s" : ""}
        </span>
      </div>
    </Link>
  );
}

function EventCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border p-5">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-40" />
        </div>
        <Skeleton className="h-5 w-10 rounded-full" />
      </div>
      <div className="flex gap-4">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

export default function Analyse() {
  const events = useQuery(api.analysis.getEventsWithSubmissions);
  const [teamSearch, setTeamSearch] = useState("");
  const [eventFilter, setEventFilter] = useState("");
  const [goEventCode, setGoEventCode] = useState("");
  const router = useRouter();

  function handleTeamSearch(e: React.FormEvent) {
    e.preventDefault();
    const num = Number.parseInt(teamSearch.trim(), 10);
    if (!Number.isNaN(num) && num > 0 && goEventCode.trim()) {
      router.push(
        `/analyse/${goEventCode.toUpperCase().trim()}/teams/${num}` as Route
      );
    }
  }

  const filteredEvents =
    events?.filter(
      (ev: { eventCode: string; eventName?: string }) =>
        ev.eventCode.toLowerCase().includes(eventFilter.toLowerCase()) ||
        ev.eventName?.toLowerCase().includes(eventFilter.toLowerCase())
    ) ?? [];

  return (
    <div className="container mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-6 flex flex-col">
        <div className="flex items-center gap-2">
          <ChartNoAxesGantt className="size-5 text-muted-foreground" />
          <h1 className="font-semibold text-2xl tracking-tight">Analyse</h1>
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="-translate-y-1/2 absolute top-1/2 left-3 size-4 text-muted-foreground" />
            <Input
              className="pl-9"
              onChange={(e) => setEventFilter(e.target.value)}
              placeholder="Filter events..."
              value={eventFilter}
            />
          </div>
        </div>

        <form className="mb-8 flex gap-2" onSubmit={handleTeamSearch}>
          <Input
            className="w-36"
            onChange={(e) => setGoEventCode(e.target.value)}
            placeholder="Event code"
            value={goEventCode}
          />
          <Input
            className="w-32"
            min={1}
            onChange={(e) => setTeamSearch(e.target.value)}
            placeholder="Team #"
            type="number"
            value={teamSearch}
          />
          <Button
            disabled={teamSearch.length === 0 || goEventCode.length === 0}
            size="default"
            type="submit"
            variant="outline"
          >
            Search
          </Button>
        </form>
      </div>

      {events === undefined ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: PASS
            <EventCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <CalendarDays className="size-10 text-muted-foreground/50" />
          <div className="flex flex-col gap-1">
            <p className="font-medium text-sm">No events found</p>
            <p className="text-muted-foreground text-sm">
              {eventFilter
                ? "No events match your search. Try a different filter."
                : "Submit FRC match or pit scouting data to see events here."}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredEvents.map(
            (ev: {
              eventCode: string;
              eventName?: string;
              matchCount: number;
              pitCount: number;
            }) => (
              <EventCard
                eventCode={ev.eventCode}
                eventName={ev.eventName}
                key={ev.eventCode}
                matchCount={ev.matchCount}
                pitCount={ev.pitCount}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}
