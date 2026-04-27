export const FIELD_IMAGE_SIZE = 2547 as const;

export const DEFAULT_HEATMAP_GRID_COLS = 24;
export const DEFAULT_HEATMAP_GRID_ROWS = 14;

export const FTC_HEATMAP_SCORING_EVENTS = [
  "autonomous_made",
  "teleop_made",
] as const;

export const FRC_PERIOD_ORDER = [
  "AUTO",
  "TRANSITION",
  "SHIFT_1",
  "SHIFT_2",
  "SHIFT_3",
  "SHIFT_4",
  "END_GAME",
] as const;

export type FrcPeriod = (typeof FRC_PERIOD_ORDER)[number];
