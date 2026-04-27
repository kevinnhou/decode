import {
  FIELD_IMAGE_SIZE,
  type FRC_PERIOD_ORDER,
  FTC_HEATMAP_SCORING_EVENTS,
} from "./constants";
import type { CompetitionType, FrcFieldEvent, FtcFieldEventDoc } from "./types";

export type HeatmapPhaseFilter =
  | "all"
  | (typeof FRC_PERIOD_ORDER)[number]
  | "TELEOP";

export type HeatSample = {
  xNorm: number;
  yNorm: number;
  matchNumber: number;
  weight: number;
  frcPeriod?: string;
  ftcPhase?: "AUTO" | "TELEOP";
};

function clamp01(n: number): number {
  if (n < 0) {
    return 0;
  }
  if (n > 1) {
    return 1;
  }
  return n;
}

export function normaliseFieldCoordinate(
  value: number,
  max = FIELD_IMAGE_SIZE
): number {
  if (!Number.isFinite(value) || max <= 0) {
    return 0;
  }
  return clamp01(value / max);
}

export function isFrcHeatmapScoringEvent(e: FrcFieldEvent): boolean {
  return e.eventType === "shooting" && e.action === "scoring";
}

export function frcSpatialScoringSamples(
  events: FrcFieldEvent[],
  matchNumber: number
): HeatSample[] {
  const out: HeatSample[] = [];
  for (const e of events) {
    if (!isFrcHeatmapScoringEvent(e)) {
      continue;
    }
    const x = e.coordinates?.x;
    const y = e.coordinates?.y;
    if (!(Number.isFinite(x) && Number.isFinite(y))) {
      continue;
    }
    out.push({
      xNorm: normaliseFieldCoordinate(x),
      yNorm: normaliseFieldCoordinate(y),
      matchNumber,
      weight: 1,
      frcPeriod: e.period,
    });
  }
  return out;
}

function ftcPhaseFromEventName(event: string): "AUTO" | "TELEOP" | undefined {
  if (event === "autonomous_made") {
    return "AUTO";
  }
  if (event === "teleop_made") {
    return "TELEOP";
  }
  return;
}

export function ftcSpatialScoringSamples(
  fieldEvents: FtcFieldEventDoc[],
  matchNumber: number
): HeatSample[] {
  const out: HeatSample[] = [];
  for (const e of fieldEvents) {
    if (
      !FTC_HEATMAP_SCORING_EVENTS.includes(
        e.event as (typeof FTC_HEATMAP_SCORING_EVENTS)[number]
      )
    ) {
      continue;
    }
    const phase = ftcPhaseFromEventName(e.event);
    if (!phase) {
      continue;
    }
    const w = Math.max(0, Math.floor(e.count ?? 0));
    if (w === 0) {
      continue;
    }
    const x = e.coordinates?.x;
    const y = e.coordinates?.y;
    if (!(Number.isFinite(x) && Number.isFinite(y))) {
      continue;
    }
    out.push({
      xNorm: normaliseFieldCoordinate(x),
      yNorm: normaliseFieldCoordinate(y),
      matchNumber,
      weight: w,
      ftcPhase: phase,
    });
  }
  return out;
}

export function collectHeatSamplesForSubmission(
  sub: {
    competitionType?: CompetitionType;
    inputMode?: string;
    frcFieldEvents?: FrcFieldEvent[] | null;
    fieldEvents?: FtcFieldEventDoc[] | null;
    matchNumber?: number;
  },
  competition: CompetitionType
): HeatSample[] {
  const matchNumber = sub.matchNumber ?? -1;
  if (matchNumber < 0) {
    return [];
  }
  if (sub.inputMode !== "field") {
    return [];
  }
  if (competition === "FRC") {
    if (!sub.frcFieldEvents?.length) {
      return [];
    }
    return frcSpatialScoringSamples(sub.frcFieldEvents, matchNumber);
  }
  if (!sub.fieldEvents?.length) {
    return [];
  }
  return ftcSpatialScoringSamples(sub.fieldEvents, matchNumber);
}

export function filterHeatSamplesByPhase(
  samples: HeatSample[],
  competition: CompetitionType,
  phase: HeatmapPhaseFilter
): HeatSample[] {
  if (phase === "all") {
    return samples;
  }
  if (competition === "FTC") {
    return samples.filter((s) => s.ftcPhase === phase);
  }
  return samples.filter((s) => s.frcPeriod === phase);
}

export function spatialEligibleMatchNumbers(
  samples: HeatSample[]
): Set<number> {
  const set = new Set<number>();
  for (const s of samples) {
    if (s.matchNumber >= 0) {
      set.add(s.matchNumber);
    }
  }
  return set;
}

export function hasFieldSpatialData(
  subs: Parameters<typeof collectHeatSamplesForSubmission>[0][],
  competition: CompetitionType
): boolean {
  for (const sub of subs) {
    if (collectHeatSamplesForSubmission(sub, competition).length > 0) {
      return true;
    }
  }
  return false;
}

export function countSpatialEligibleMatches(
  subs: Parameters<typeof collectHeatSamplesForSubmission>[0][],
  competition: CompetitionType
): number {
  const all: HeatSample[] = [];
  for (const sub of subs) {
    all.push(...collectHeatSamplesForSubmission(sub, competition));
  }
  return spatialEligibleMatchNumbers(all).size;
}
