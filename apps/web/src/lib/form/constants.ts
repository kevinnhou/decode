import type { FrcPeriodDataMap } from "@/schema/scouting";
import type { SectionConfig } from "./types";

export const INITIAL_PERIOD_DATA: FrcPeriodDataMap = {
  auto: { scoring: 0, feeding: 0, defense: 0 },
  transition: { scoring: 0, feeding: 0, defense: 0 },
  shift1: { scoring: 0, feeding: 0, defense: 0 },
  shift2: { scoring: 0, feeding: 0, defense: 0 },
  shift3: { scoring: 0, feeding: 0, defense: 0 },
  shift4: { scoring: 0, feeding: 0, defense: 0 },
  endGame: { scoring: 0, feeding: 0, defense: 0 },
};

export const FRC_PERIOD_TO_KEY: Record<FrcPeriod, keyof FrcPeriodDataMap> = {
  AUTO: "auto",
  DOWNTIME: "transition",
  SHIFT_1: "shift1",
  SHIFT_2: "shift2",
  SHIFT_3: "shift3",
  SHIFT_4: "shift4",
  SHIFT_5: "shift4",
  END_GAME: "endGame",
};

export const PIT_SECTION_CONFIG: SectionConfig[] = [
  { id: "metadata", label: "Metadata" },
  { id: "robotDimensions", label: "Robot Dimensions" },
  { id: "capabilities", label: "Capabilities" },
  { id: "fieldTraversal", label: "Navigation" },
  { id: "notes", label: "Notes" },
];

export const INTAKE_METHOD_OPTIONS = [
  { id: "floor" as const, label: "Floor" },
  { id: "depot" as const, label: "Depot" },
  { id: "outpost" as const, label: "Outpost/Human Player" },
];

export const MATCH_STAGE_OPTIONS = [
  { value: "practice", label: "Practice" },
  { value: "qual", label: "Qualification" },
  { value: "playoff", label: "Playoff" },
] as const;

export const ALLIANCE_COLOUR_OPTIONS = [
  { value: "Red", label: "Red" },
  { value: "Blue", label: "Blue" },
] as const;

export const DRIVETRAIN_TYPE_OPTIONS = [
  { value: "swerve", label: "Swerve" },
  { value: "tank", label: "Tank" },
  { value: "other", label: "Other" },
] as const;

export const CLIMB_LEVEL_OPTIONS = [
  { value: "0", label: "Level 0 - No Climb" },
  { value: "1", label: "Level 1" },
  { value: "2", label: "Level 2" },
  { value: "3", label: "Level 3" },
] as const;

export const INITIAL_TIME_SECONDS = 165;

export const FRC_POST_AUTO_DOWNTIME_SECONDS = 5;

export const FRC_TELEOP_WALL_SECONDS = 140;
export const PAUSE_TIME_SECONDS = 120; // 2:00
export const FINAL_TIME_SECONDS = 0;

export type TimerState = "idle" | "running" | "paused" | "finished";

export type FrcPeriod =
  | "AUTO"
  | "DOWNTIME"
  | "SHIFT_1"
  | "SHIFT_2"
  | "SHIFT_3"
  | "SHIFT_4"
  | "SHIFT_5"
  | "END_GAME";

export const FTC_INITIAL_TIME_SECONDS = 165;

export type FtcPeriod = "AUTO" | "TRANSITION" | "TELEOP";

export const FTC_PERIOD_BOUNDARIES: {
  start: number;
  end: number;
  period: FtcPeriod;
}[] = [
  { start: 0, end: 30, period: "AUTO" },
  { start: 30, end: 45, period: "TRANSITION" },
  { start: 45, end: 165, period: "TELEOP" },
];

export const FTC_PERIOD_TO_KEY: Record<
  FtcPeriod,
  "auto" | "transition" | "teleop"
> = {
  AUTO: "auto",
  TRANSITION: "transition",
  TELEOP: "teleop",
};

export const FTC_INTAKE_METHOD_OPTIONS = [
  { id: "floor" as const, label: "Floor" },
  { id: "outpost" as const, label: "Human Player" },
];

export const FTC_PIT_SECTION_CONFIG: SectionConfig[] = [
  { id: "metadata", label: "Metadata" },
  { id: "robotDimensions", label: "Robot Dimensions" },
  { id: "capabilities", label: "Capabilities" },
  { id: "notes", label: "Notes" },
];

const FRC_AUTO_END = 20;
const FRC_TELEOP_START = FRC_AUTO_END + FRC_POST_AUTO_DOWNTIME_SECONDS;
const FRC_MATCH_END = FRC_TELEOP_START + FRC_TELEOP_WALL_SECONDS;

const FRC_ALLIANCE_SHIFT_WALL_SECONDS_REMAINING = [130, 105, 80, 55] as const;
const FRC_ENDGAME_WALL_SECONDS_REMAINING = 30;

function frcMatchElapsedAtTeleopWallRemaining(
  wallSecondsRemaining: number
): number {
  return FRC_TELEOP_START + (FRC_TELEOP_WALL_SECONDS - wallSecondsRemaining);
}

const FRC_SHIFT_1_END = frcMatchElapsedAtTeleopWallRemaining(
  FRC_ALLIANCE_SHIFT_WALL_SECONDS_REMAINING[0]
);
const FRC_SHIFT_2_END = frcMatchElapsedAtTeleopWallRemaining(
  FRC_ALLIANCE_SHIFT_WALL_SECONDS_REMAINING[1]
);
const FRC_SHIFT_3_END = frcMatchElapsedAtTeleopWallRemaining(
  FRC_ALLIANCE_SHIFT_WALL_SECONDS_REMAINING[2]
);
const FRC_SHIFT_4_END = frcMatchElapsedAtTeleopWallRemaining(
  FRC_ALLIANCE_SHIFT_WALL_SECONDS_REMAINING[3]
);
const FRC_ENDGAME_START = frcMatchElapsedAtTeleopWallRemaining(
  FRC_ENDGAME_WALL_SECONDS_REMAINING
);

export const FRC_PERIOD_BOUNDARIES: {
  start: number;
  end: number;
  period: FrcPeriod;
}[] = [
  { start: 0, end: FRC_AUTO_END, period: "AUTO" },
  {
    start: FRC_AUTO_END,
    end: FRC_TELEOP_START,
    period: "DOWNTIME",
  },
  { start: FRC_TELEOP_START, end: FRC_SHIFT_1_END, period: "SHIFT_1" },
  { start: FRC_SHIFT_1_END, end: FRC_SHIFT_2_END, period: "SHIFT_2" },
  { start: FRC_SHIFT_2_END, end: FRC_SHIFT_3_END, period: "SHIFT_3" },
  { start: FRC_SHIFT_3_END, end: FRC_SHIFT_4_END, period: "SHIFT_4" },
  {
    start: FRC_SHIFT_4_END,
    end: FRC_ENDGAME_START,
    period: "SHIFT_5",
  },
  {
    start: FRC_ENDGAME_START,
    end: FRC_MATCH_END,
    period: "END_GAME",
  },
];
