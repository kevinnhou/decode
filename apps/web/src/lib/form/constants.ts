import type { FrcPeriod } from "@/hooks/use-match-timer";
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
