import { FRC_PERIOD_ORDER, type FrcPeriod } from "./constants";
import type { FrcFieldEvent, FrcPeriodData } from "./types";

export type PerPeriodMap = Record<string, number>;

export function sumScoringSeconds(periodData: FrcPeriodData): number {
  return (
    periodData.auto.scoring +
    periodData.transition.scoring +
    periodData.shift1.scoring +
    periodData.shift2.scoring +
    periodData.shift3.scoring +
    periodData.shift4.scoring +
    periodData.endGame.scoring
  );
}

export function sumDefenseSeconds(periodData: FrcPeriodData): number {
  return (
    periodData.auto.defense +
    periodData.transition.defense +
    periodData.shift1.defense +
    periodData.shift2.defense +
    periodData.shift3.defense +
    periodData.shift4.defense +
    periodData.endGame.defense
  );
}

export function countFrcScoringEvents(events: FrcFieldEvent[]): number {
  return events.filter(
    (e) => e.eventType === "shooting" && e.action === "scoring"
  ).length;
}

export function sumDefenseEventSeconds(events: FrcFieldEvent[]): number {
  return events
    .filter((e) => e.eventType === "defense")
    .reduce((sum, e) => sum + e.duration / 1000, 0);
}

export function perPeriodScoringFromPeriodData(
  periodData: FrcPeriodData
): PerPeriodMap {
  return {
    AUTO: periodData.auto.scoring,
    TRANSITION: periodData.transition.scoring,
    SHIFT_1: periodData.shift1.scoring,
    SHIFT_2: periodData.shift2.scoring,
    SHIFT_3: periodData.shift3.scoring,
    SHIFT_4: periodData.shift4.scoring,
    END_GAME: periodData.endGame.scoring,
  };
}

export function perPeriodScoringFromFieldEvents(
  events: FrcFieldEvent[]
): PerPeriodMap {
  const result: PerPeriodMap = {};
  for (const period of FRC_PERIOD_ORDER) {
    result[period] = events.filter(
      (e) =>
        e.period === period &&
        e.eventType === "shooting" &&
        e.action === "scoring"
    ).length;
  }
  return result;
}

export function addPerPeriodFromFrcSubmission(
  totals: PerPeriodMap,
  sub: {
    inputMode: string;
    periodData?: FrcPeriodData | null;
    frcFieldEvents?: FrcFieldEvent[] | null;
  }
): void {
  if (sub.inputMode === "form" && sub.periodData) {
    const pp = perPeriodScoringFromPeriodData(sub.periodData);
    for (const [key, val] of Object.entries(pp)) {
      totals[key] = (totals[key] ?? 0) + val;
    }
  } else if (sub.inputMode === "field" && sub.frcFieldEvents) {
    const pp = perPeriodScoringFromFieldEvents(sub.frcFieldEvents);
    for (const [key, val] of Object.entries(pp)) {
      totals[key] = (totals[key] ?? 0) + val;
    }
  }
}

export function emptyFrcPerPeriodTotals(): PerPeriodMap {
  return {
    AUTO: 0,
    TRANSITION: 0,
    SHIFT_1: 0,
    SHIFT_2: 0,
    SHIFT_3: 0,
    SHIFT_4: 0,
    END_GAME: 0,
  };
}

export function computeFrcPerPeriodAverages(
  frcMatchSubs: Array<{
    inputMode: string;
    periodData?: FrcPeriodData | null;
    frcFieldEvents?: FrcFieldEvent[] | null;
  }>
): PerPeriodMap {
  const totals = emptyFrcPerPeriodTotals();
  for (const sub of frcMatchSubs) {
    addPerPeriodFromFrcSubmission(totals, sub);
  }
  const matchCount = frcMatchSubs.length;
  const avg: PerPeriodMap = {};
  for (const [key, val] of Object.entries(totals)) {
    avg[key] = matchCount > 0 ? Math.round((val / matchCount) * 10) / 10 : 0;
  }
  return avg;
}

export function frcScoringSummaryForMatch(sub: {
  inputMode: string;
  periodData?: FrcPeriodData | null;
  frcFieldEvents?: FrcFieldEvent[] | null;
}): number {
  if (sub.inputMode === "form" && sub.periodData) {
    return Object.values(sub.periodData).reduce(
      (sum, p) => sum + (p.scoring ?? 0),
      0
    );
  }
  if (sub.inputMode === "field" && sub.frcFieldEvents) {
    return countFrcScoringEvents(sub.frcFieldEvents);
  }
  return 0;
}

function shiftPointsFromFuel(s1: number, s2: number, s3: number, s4: number) {
  const s13 = s1 + s3;
  const s24 = s2 + s4;
  return s13 >= s24 ? s13 : s24;
}

/**
 * Heuristic “points” from scoring activity and pit shooting speed (FRC form),
 * or period event counts (FRC field). Returns null when form mode lacks a
 * positive shooting speed.
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: mirrors legacy scout fuel heuristic
export function frcFuelPointsForMatch(
  sub: {
    inputMode: string;
    periodData?: FrcPeriodData | null;
    frcFieldEvents?: FrcFieldEvent[] | null;
  },
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
    const byPeriod: Partial<Record<FrcPeriod, number>> = {};
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
