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
  TRANSITION: "transition",
  SHIFT_1: "shift1",
  SHIFT_2: "shift2",
  SHIFT_3: "shift3",
  SHIFT_4: "shift4",
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

export const INITIAL_TIME_SECONDS = 160; // 2:40 (20s AUTO + 2:20 TELEOP)
export const PAUSE_TIME_SECONDS = 120; // 2:00
export const FINAL_TIME_SECONDS = 0;

export type TimerState = "idle" | "running" | "paused" | "finished";

export type FrcPeriod =
  | "AUTO"
  | "TRANSITION"
  | "SHIFT_1"
  | "SHIFT_2"
  | "SHIFT_3"
  | "SHIFT_4"
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

export const FRC_PERIOD_BOUNDARIES: {
  start: number;
  end: number;
  period: FrcPeriod;
}[] = [
  { start: 0, end: 20, period: "AUTO" },
  { start: 20, end: 30, period: "TRANSITION" },
  { start: 30, end: 55, period: "SHIFT_1" },
  { start: 55, end: 80, period: "SHIFT_2" },
  { start: 80, end: 105, period: "SHIFT_3" },
  { start: 105, end: 130, period: "SHIFT_4" },
  { start: 130, end: 160, period: "END_GAME" },
];
