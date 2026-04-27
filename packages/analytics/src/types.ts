import type { FrcPeriod } from "./constants";

export type PeriodSlice = {
  scoring: number;
  feeding: number;
  defense: number;
};

export type FrcPeriodData = {
  auto: PeriodSlice;
  transition: PeriodSlice;
  shift1: PeriodSlice;
  shift2: PeriodSlice;
  shift3: PeriodSlice;
  shift4: PeriodSlice;
  endGame: PeriodSlice;
};

export type FrcFieldEvent = {
  coordinates: { x: number; y: number };
  startTimestamp: string;
  endTimestamp: string;
  duration: number;
  period: FrcPeriod;
  eventType: string;
  action?: string;
  source?: string;
  climbLevel?: number;
};

export type FtcPeriodDataDoc = {
  auto: { made: number; missed: number };
  teleop: { made: number; missed: number };
};

export type FtcFieldEventDoc = {
  event: string;
  count: number;
  coordinates: { x: number; y: number };
  timestamp: string;
};

export type CompetitionType = "FRC" | "FTC";

export type FrcQuantitativeSubmission = {
  inputMode: string;
  periodData?: FrcPeriodData | null;
  frcFieldEvents?: FrcFieldEvent[] | null;
  climbLevel?: number;
  climbDuration?: number;
};

export type FtcQuantitativeSubmission = {
  inputMode: string;
  climbLevel?: number;
  climbDuration?: number;
  ftcPeriodData?: FtcPeriodDataDoc | null;
  autonomousMade?: number;
  autonomousMissed?: number;
  teleopMade?: number;
  teleopMissed?: number;
  fieldEvents?: FtcFieldEventDoc[] | null;
  tags?: string[] | null;
};

export type MatchSubmissionSlice = FrcQuantitativeSubmission &
  FtcQuantitativeSubmission & {
    competitionType?: CompetitionType;
    matchNumber?: number;
  };
