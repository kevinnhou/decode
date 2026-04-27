import type { CompetitionType, MatchSubmissionSlice } from "./types";

export type ParsedMatchSubmission = {
  competition: CompetitionType;
  formSlice: {
    inputMode: string;
    periodData?: MatchSubmissionSlice["periodData"];
    ftcPeriodData?: MatchSubmissionSlice["ftcPeriodData"];
    autonomousMade?: number;
    teleopMade?: number;
  };
  fieldSlice: {
    inputMode: string;
    frcFieldEvents?: MatchSubmissionSlice["frcFieldEvents"];
    fieldEvents?: MatchSubmissionSlice["fieldEvents"];
  };
};

export function parseMatchSubmission(
  doc: MatchSubmissionSlice
): ParsedMatchSubmission {
  const competition: CompetitionType =
    doc.competitionType === "FTC" ? "FTC" : "FRC";
  return {
    competition,
    formSlice: {
      inputMode: doc.inputMode,
      periodData: doc.periodData,
      ftcPeriodData: doc.ftcPeriodData,
      autonomousMade: doc.autonomousMade,
      teleopMade: doc.teleopMade,
    },
    fieldSlice: {
      inputMode: doc.inputMode,
      frcFieldEvents: doc.frcFieldEvents,
      fieldEvents: doc.fieldEvents,
    },
  };
}
