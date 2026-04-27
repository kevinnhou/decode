/** biome-ignore lint/performance/noBarrelFile: PASS */
export {
  accumulateFrcSubmission,
  accumulateFtcSubmission,
  buildAggregateFromAccumulator,
  emptyAccumulator,
  type TeamAccumulator,
} from "./aggregate";
export {
  DEFAULT_HEATMAP_GRID_COLS,
  DEFAULT_HEATMAP_GRID_ROWS,
  FIELD_IMAGE_SIZE,
  FRC_PERIOD_ORDER,
  type FrcPeriod,
  FTC_HEATMAP_SCORING_EVENTS,
} from "./constants";
export {
  addPerPeriodFromFrcSubmission,
  computeFrcPerPeriodAverages,
  countFrcScoringEvents,
  emptyFrcPerPeriodTotals,
  frcFuelPointsForMatch,
  frcScoringSummaryForMatch,
  type PerPeriodMap,
  perPeriodScoringFromFieldEvents,
  perPeriodScoringFromPeriodData,
  sumDefenseEventSeconds,
  sumDefenseSeconds,
  sumScoringSeconds,
} from "./frc-quantitative";
export {
  computeFtcPerPeriodAverages,
  type FtcPeriodMakes,
  ftcDefenseFlag,
  ftcPeriodMakes,
  ftcTotalMakes,
} from "./ftc-quantitative";
export { type BinnedHeatmap, binHeatmap, type HeatmapBin } from "./heatmap";
export { type ParsedMatchSubmission, parseMatchSubmission } from "./parse";
export {
  buildFrcPeriodChartAverages,
  buildFtcPeriodChartAverages,
  type PeriodChartRow,
} from "./period-series";
export {
  collectHeatSamplesForSubmission,
  countSpatialEligibleMatches,
  filterHeatSamplesByPhase,
  frcSpatialScoringSamples,
  ftcSpatialScoringSamples,
  type HeatmapPhaseFilter,
  type HeatSample,
  hasFieldSpatialData,
  isFrcHeatmapScoringEvent,
  normaliseFieldCoordinate,
  spatialEligibleMatchNumbers,
} from "./spatial";
export type {
  CompetitionType,
  FrcFieldEvent,
  FrcPeriodData,
  FrcQuantitativeSubmission,
  FtcFieldEventDoc,
  FtcPeriodDataDoc,
  FtcQuantitativeSubmission,
  MatchSubmissionSlice,
  PeriodSlice,
} from "./types";
