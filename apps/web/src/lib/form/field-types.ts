import type { ZodType } from "zod";

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

export type InputModeValue =
  | "none"
  | "text"
  | "decimal"
  | "numeric"
  | "tel"
  | "search"
  | "email"
  | "url";

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

export type FrcMatchFieldName =
  | "meta.teamNumber"
  | "meta.matchNumber"
  | "meta.matchStage"
  | "meta.allianceColour"
  | "meta.teamName"
  | "climbLevel"
  | "climbDuration"
  | "notes";
