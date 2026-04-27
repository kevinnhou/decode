import { FRC_PERIOD_ORDER } from "./constants";
import { perPeriodScoringFromFieldEvents } from "./frc-quantitative";
import { ftcPeriodMakes } from "./ftc-quantitative";
import type {
  FrcFieldEvent,
  FrcPeriodData,
  FtcFieldEventDoc,
  FtcPeriodDataDoc,
} from "./types";

export type PeriodChartRow = { periodKey: string; scoring: number };

function periodTotalsFromFormSub(
  periodData: FrcPeriodData,
  totals: Record<string, number>
): void {
  totals.AUTO = (totals.AUTO ?? 0) + periodData.auto.scoring;
  totals.TRANSITION = (totals.TRANSITION ?? 0) + periodData.transition.scoring;
  totals.SHIFT_1 = (totals.SHIFT_1 ?? 0) + periodData.shift1.scoring;
  totals.SHIFT_2 = (totals.SHIFT_2 ?? 0) + periodData.shift2.scoring;
  totals.SHIFT_3 = (totals.SHIFT_3 ?? 0) + periodData.shift3.scoring;
  totals.SHIFT_4 = (totals.SHIFT_4 ?? 0) + periodData.shift4.scoring;
  totals.END_GAME = (totals.END_GAME ?? 0) + periodData.endGame.scoring;
}

function periodTotalsFromFieldSub(
  events: FrcFieldEvent[],
  totals: Record<string, number>
): void {
  const per = perPeriodScoringFromFieldEvents(events);
  for (const p of FRC_PERIOD_ORDER) {
    totals[p] = (totals[p] ?? 0) + (per[p] ?? 0);
  }
}

export function buildFrcPeriodChartAverages(
  matchSubs: Array<{
    inputMode: string;
    periodData?: FrcPeriodData | null;
    frcFieldEvents?: FrcFieldEvent[] | null;
  }>
): PeriodChartRow[] {
  const totals: Record<string, number> = {};
  let n = 0;
  for (const sub of matchSubs) {
    if (sub.inputMode === "form" && sub.periodData) {
      n += 1;
      periodTotalsFromFormSub(sub.periodData, totals);
    } else if (sub.inputMode === "field" && sub.frcFieldEvents) {
      n += 1;
      periodTotalsFromFieldSub(sub.frcFieldEvents, totals);
    }
  }
  return FRC_PERIOD_ORDER.map((periodKey) => ({
    periodKey,
    scoring: n > 0 ? Math.round(((totals[periodKey] ?? 0) / n) * 10) / 10 : 0,
  }));
}

export function buildFtcPeriodChartAverages(
  matchSubs: Array<{
    ftcPeriodData?: FtcPeriodDataDoc | null;
    autonomousMade?: number;
    teleopMade?: number;
    fieldEvents?: FtcFieldEventDoc[] | null;
  }>
): PeriodChartRow[] {
  const n = matchSubs.length;
  if (n === 0) {
    return [];
  }
  let autoSum = 0;
  let teleopSum = 0;
  for (const sub of matchSubs) {
    const { auto, teleop } = ftcPeriodMakes(sub);
    autoSum += auto;
    teleopSum += teleop;
  }
  return [
    { periodKey: "AUTO", scoring: Math.round((autoSum / n) * 10) / 10 },
    { periodKey: "TELEOP", scoring: Math.round((teleopSum / n) * 10) / 10 },
  ];
}
