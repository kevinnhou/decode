import { formSchema, metaSchema } from "@/schema/scouting";
import type { FieldGroup } from "./field-types";

export const TAGS = ["penalties", "defense", "climb"];

export const FIELD_GROUPS: FieldGroup[] = [
  {
    id: "meta",
    className: "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4",
    fields: [
      {
        component: "input",
        name: "meta.teamNumber",
        label: "Team Number",
        schema: metaSchema.shape.teamNumber,
        inputType: "number",
        inputMode: "numeric",
        placeholder: "Enter Team Number",
      },
      {
        component: "input",
        name: "meta.qualification",
        label: "Qualification Number",
        schema: metaSchema.shape.qualification,
        inputType: "number",
        inputMode: "numeric",
        placeholder: "Enter Qualification Number",
      },
      {
        component: "input",
        name: "meta.teamName",
        label: "Team Name",
        schema: metaSchema.shape.teamName,
        placeholder: "Enter Team Name",
        clearEmptyString: true,
        optional: true,
      },
      {
        component: "select",
        name: "meta.allianceColour",
        label: "Alliance Colour",
        schema: metaSchema.shape.allianceColour,
        options: ["Blue", "Red"],
        optional: true,
      },
    ],
  },
  {
    id: "stats",
    className: "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4",
    fields: [
      {
        component: "integer",
        name: "autonomousMissed",
        label: "Autonomous Missed",
        schema: formSchema.shape.autonomousMissed,
        incrementKey: "q",
      },
      {
        component: "integer",
        name: "autonomousMade",
        label: "Autonomous Made",
        schema: formSchema.shape.autonomousMade,
        incrementKey: "w",
      },
      {
        component: "integer",
        name: "teleopMissed",
        label: "Teleop Missed",
        schema: formSchema.shape.teleopMissed,
        incrementKey: "e",
      },
      {
        component: "integer",
        name: "teleopMade",
        label: "Teleop Made",
        schema: formSchema.shape.teleopMade,
        incrementKey: "r",
      },
    ],
  },
  {
    id: "tags",
    className: "grid grid-cols-1",
    fields: [
      {
        component: "tags",
        name: "tags",
        label: "Tags",
        schema: formSchema.shape.tags,
      },
    ],
  },
];

export const FRC_PERIODS = [
  { key: "auto" as const, label: "AUTO" },
  { key: "transition" as const, label: "Transition" },
  { key: "shift1" as const, label: "Shift 1" },
  { key: "shift2" as const, label: "Shift 2" },
  { key: "shift3" as const, label: "Shift 3" },
  { key: "shift4" as const, label: "Shift 4" },
  { key: "endGame" as const, label: "End Game" },
] as const;

export const FRC_CLIMB_LEVELS = [
  { value: 0, label: "No Climb" },
  { value: 1, label: "Level 1" },
  { value: 2, label: "Level 2" },
  { value: 3, label: "Level 3" },
] as const;
