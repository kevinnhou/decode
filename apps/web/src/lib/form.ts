import type { ZodType } from "zod";
import { formSchema, metaSchema } from "@/schema/scouting";

export type FieldName =
  | "meta.teamNumber"
  | "meta.qualification"
  | "meta.teamName"
  | "meta.allianceColour"
  | "autonomousMissed"
  | "autonomousMade"
  | "teleopMissed"
  | "teleopMade"
  | "tags";

export type FieldComponent = "input" | "select" | "integer" | "tags";

export type BaseField = {
  component: FieldComponent;
  name: FieldName;
  label: string;
  optional?: boolean;
  schema: ZodType;
};

export type InputField = BaseField & {
  component: "input";
  inputType?: "number" | "text";
  inputMode?: InputModeValue;
  placeholder?: string;
  emptyValue?: number | undefined;
  clearEmptyString?: boolean;
};

export type SelectField = BaseField & {
  component: "select";
  options: string[];
};

export type IntegerField = BaseField & {
  component: "integer";
  incrementKey?: string;
};

export type TagField = BaseField & {
  component: "tags";
};

export type FieldDefinition =
  | InputField
  | SelectField
  | IntegerField
  | TagField;

export type FieldGroup = {
  id: string;
  className?: string;
  fields: FieldDefinition[];
};

export type InputModeValue =
  | "none"
  | "text"
  | "decimal"
  | "numeric"
  | "tel"
  | "search"
  | "email"
  | "url";

export const TAGS = ["penalties", "defense"];

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
