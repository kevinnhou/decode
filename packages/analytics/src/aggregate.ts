import {
  countFrcScoringEvents,
  sumDefenseEventSeconds,
  sumDefenseSeconds,
  sumScoringSeconds,
} from "./frc-quantitative";
import { ftcDefenseFlag, ftcTotalMakes } from "./ftc-quantitative";
import type {
  FrcFieldEvent,
  FrcPeriodData,
  FtcQuantitativeSubmission,
} from "./types";

export type TeamAccumulator = {
  totalScoring: number;
  totalDefense: number;
  climbSuccess: number;
  totalClimbLevel: number;
  totalClimbDuration: number;
  climbDurationCount: number;
  formCount: number;
  fieldCount: number;
};

export function emptyAccumulator(): TeamAccumulator {
  return {
    totalScoring: 0,
    totalDefense: 0,
    climbSuccess: 0,
    totalClimbLevel: 0,
    totalClimbDuration: 0,
    climbDurationCount: 0,
    formCount: 0,
    fieldCount: 0,
  };
}

function applyClimbToAccumulator(
  acc: TeamAccumulator,
  sub: { climbLevel?: number; climbDuration?: number }
): void {
  if ((sub.climbLevel ?? 0) > 0) {
    acc.climbSuccess += 1;
  }
  acc.totalClimbLevel += sub.climbLevel ?? 0;
  if (sub.climbDuration && sub.climbDuration > 0) {
    acc.totalClimbDuration += sub.climbDuration;
    acc.climbDurationCount += 1;
  }
}

export function accumulateFrcSubmission(
  acc: TeamAccumulator,
  sub: {
    climbLevel?: number;
    climbDuration?: number;
    inputMode: string;
    periodData?: FrcPeriodData | null;
    frcFieldEvents?: FrcFieldEvent[] | null;
  }
): void {
  applyClimbToAccumulator(acc, sub);

  if (sub.inputMode === "form" && sub.periodData) {
    acc.formCount += 1;
    acc.totalScoring += sumScoringSeconds(sub.periodData);
    acc.totalDefense += sumDefenseSeconds(sub.periodData);
  } else if (
    sub.inputMode === "field" &&
    sub.frcFieldEvents &&
    Array.isArray(sub.frcFieldEvents)
  ) {
    acc.fieldCount += 1;
    acc.totalScoring += countFrcScoringEvents(sub.frcFieldEvents);
    acc.totalDefense += sumDefenseEventSeconds(sub.frcFieldEvents);
  }
}

export function accumulateFtcSubmission(
  acc: TeamAccumulator,
  sub: FtcQuantitativeSubmission
): void {
  applyClimbToAccumulator(acc, sub);

  acc.totalScoring += ftcTotalMakes(sub);
  acc.totalDefense += ftcDefenseFlag(sub);

  if (sub.inputMode === "form") {
    acc.formCount += 1;
  } else {
    acc.fieldCount += 1;
  }
}

export function buildAggregateFromAccumulator(
  teamNumber: number,
  acc: TeamAccumulator,
  matchCount: number
) {
  const climbSuccessRate =
    matchCount > 0 ? Math.round((acc.climbSuccess / matchCount) * 100) : 0;
  const avgClimbLevel =
    matchCount > 0
      ? Math.round((acc.totalClimbLevel / matchCount) * 10) / 10
      : 0;
  const avgClimbDuration =
    acc.climbDurationCount > 0
      ? Math.round(acc.totalClimbDuration / acc.climbDurationCount)
      : 0;
  const avgScoringActivity =
    matchCount > 0 ? Math.round((acc.totalScoring / matchCount) * 10) / 10 : 0;
  const avgDefenseActivity =
    matchCount > 0 ? Math.round((acc.totalDefense / matchCount) * 10) / 10 : 0;
  const primaryInputMode =
    acc.formCount >= acc.fieldCount ? ("form" as const) : ("field" as const);

  return {
    teamNumber,
    matchCount,
    climbSuccessRate,
    avgClimbLevel,
    avgClimbDuration,
    avgScoringActivity,
    avgDefenseActivity,
    primaryInputMode,
    formMatchCount: acc.formCount,
    fieldMatchCount: acc.fieldCount,
  };
}
