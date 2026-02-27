import { z } from "zod";

// --- Scout attribution (server-attached, not client-supplied) ---

export const scoutAttributionSchema = z.object({
  organisationId: z.string().min(1, "Organisation ID is required"),
  scoutUserId: z.string().min(1, "Scout user ID is required"),
  scoutName: z.string().min(1, "Scout name is required"),
  createdAt: z.number(),
});

export type ScoutAttribution = z.infer<typeof scoutAttributionSchema>;

// --- Meta ---

export const metaSchema = z.object({
  teamNumber: z.number().int().min(1, "Team Number is required"),
  qualification: z.number().int().min(1, "Qualification Number is required"),
  teamName: z.string().optional(),
  allianceColour: z.enum(["Blue", "Red"]).optional(),
});

export const formSchema = z.object({
  meta: metaSchema,
  autonomousMissed: z.number().int().min(0),
  autonomousMade: z.number().int().min(0),
  teleopMissed: z.number().int().min(0),
  teleopMade: z.number().int().min(0),
  tags: z.array(z.string()),
});

export type MetaSchema = z.infer<typeof metaSchema>;
export type FormSchema = z.infer<typeof formSchema>;

export const fieldEventSchema = z.object({
  event: z.string(),
  coordinates: z.object({
    x: z.number(),
    y: z.number(),
  }),
  timestamp: z
    .string()
    .regex(/^\d{1,2}:\d{2}$/, "Timestamp must be in MM:SS format"),
  count: z.number().int().min(0),
});

export const fieldSchema = z.array(fieldEventSchema);

export type FieldEventSchema = z.infer<typeof fieldEventSchema>;
export type FieldSchema = z.infer<typeof fieldSchema>;

export const spreadsheetConfigSchema = z.object({
  eventCode: z.string().min(1, "Event code is required"),
  spreadsheetId: z.string().optional(),
  sheetId: z.string().optional(),
});

export type SpreadsheetConfigSchema = z.infer<typeof spreadsheetConfigSchema>;

export const unifiedSubmissionSchema = z.object({
  meta: metaSchema,
  autonomousMissed: z.number().int().min(0),
  autonomousMade: z.number().int().min(0),
  teleopMissed: z.number().int().min(0),
  teleopMade: z.number().int().min(0),
  tags: z.array(z.string()),
  fieldEvents: fieldSchema.optional(),
});

export type UnifiedSubmissionSchema = z.infer<typeof unifiedSubmissionSchema>;

export const attributedSubmissionSchema = unifiedSubmissionSchema.merge(
  scoutAttributionSchema
);

export type AttributedSubmissionSchema = z.infer<
  typeof attributedSubmissionSchema
>;

// --- FRC Pit Scouting ---

export const frcPitFormSchema = z.object({
  teamNumber: z.number().int().min(1, "Team number is required"),
  photos: z.array(z.string()).optional(),
  robotDimensions: z
    .object({
      length: z.number().min(0).optional(),
      width: z.number().min(0).optional(),
      height: z.number().min(0).optional(),
    })
    .optional(),
  drivetrainType: z.enum(["swerve", "tank", "other"]).optional(),
  weight: z.number().min(0).optional(),
  hopperCapacity: z.number().int().min(0).optional(),
  shootingSpeed: z.number().min(0).optional(),
  intakeMethods: z
    .array(z.enum(["floor", "depot", "outpost"]))
    .optional()
    .default([]),
  canPassTrench: z.boolean().optional().default(false),
  canCrossBump: z.boolean().optional().default(false),
  maxClimbLevel: z
    .union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)])
    .optional(),
  autoCapabilities: z.string().optional(),
  notes: z.string().optional(),
});

export type FrcPitFormSchema = z.infer<typeof frcPitFormSchema>;

// --- FRC Match Scouting ---

export const frcPeriodSchema = z.enum([
  "AUTO",
  "TRANSITION",
  "SHIFT_1",
  "SHIFT_2",
  "SHIFT_3",
  "SHIFT_4",
  "END_GAME",
]);

export type FrcPeriod = z.infer<typeof frcPeriodSchema>;

export const frcMatchMetaSchema = z.object({
  teamNumber: z.number().int().min(1, "Team number is required"),
  matchNumber: z.number().int().min(1, "Match number is required"),
  matchStage: z.enum(["practice", "qual", "playoff"]),
  allianceColour: z.enum(["Red", "Blue"]),
  teamName: z.string().optional(),
});

export type FrcMatchMetaSchema = z.infer<typeof frcMatchMetaSchema>;

export const frcPeriodDataSchema = z.object({
  scoring: z.number().min(0),
  feeding: z.number().min(0),
  defense: z.number().min(0),
});

export type FrcPeriodData = z.infer<typeof frcPeriodDataSchema>;

export const frcPeriodDataMapSchema = z.object({
  auto: frcPeriodDataSchema,
  transition: frcPeriodDataSchema,
  shift1: frcPeriodDataSchema,
  shift2: frcPeriodDataSchema,
  shift3: frcPeriodDataSchema,
  shift4: frcPeriodDataSchema,
  endGame: frcPeriodDataSchema,
});

export type FrcPeriodDataMap = z.infer<typeof frcPeriodDataMapSchema>;

export const frcFieldEventTypeSchema = z.enum([
  "shooting",
  "intake",
  "defense",
  "climb",
]);

export type FrcFieldEventType = z.infer<typeof frcFieldEventTypeSchema>;

export const frcFieldEventSchema = z.object({
  coordinates: z.object({ x: z.number(), y: z.number() }),
  startTimestamp: z
    .string()
    .regex(/^\d{1,2}:\d{2}$/, "Timestamp must be in MM:SS format"),
  endTimestamp: z
    .string()
    .regex(/^\d{1,2}:\d{2}$/, "Timestamp must be in MM:SS format"),
  duration: z.number().min(0),
  period: frcPeriodSchema,
  eventType: frcFieldEventTypeSchema,
  action: z.enum(["scoring", "feeding"]).optional(),
  source: z.enum(["floor", "depot", "outpost"]).optional(),
  climbLevel: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
});

export type FrcFieldEvent = z.infer<typeof frcFieldEventSchema>;

export const frcFieldEventArraySchema = z.array(frcFieldEventSchema);

export const frcAutoPathPointSchema = z.object({
  coordinates: z.object({ x: z.number(), y: z.number() }),
  timestamp: z
    .string()
    .regex(/^\d{1,2}:\d{2}$/, "Timestamp must be in MM:SS format"),
});

export type FrcAutoPathPoint = z.infer<typeof frcAutoPathPointSchema>;

export const frcAutoPathSchema = z.array(frcAutoPathPointSchema);

export type FrcAutoPath = z.infer<typeof frcAutoPathSchema>;

export const frcMatchFormSchema = z.object({
  periodData: frcPeriodDataMapSchema.optional(),
  frcFieldEvents: frcFieldEventArraySchema.optional(),
  autoPath: frcAutoPathSchema.optional(),
  climbLevel: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  climbDuration: z.number().min(0),
  notes: z.string().optional(),
});

export type FrcMatchFormSchema = z.infer<typeof frcMatchFormSchema>;

export const frcMatchSubmissionSchema = z.object({
  meta: frcMatchMetaSchema,
  inputMode: z.enum(["form", "field"]),
  periodData: frcPeriodDataMapSchema.optional(),
  frcFieldEvents: frcFieldEventArraySchema.optional(),
  autoPath: frcAutoPathSchema.optional(),
  climbLevel: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  climbDuration: z.number().min(0),
  notes: z.string().optional(),
});

export type FrcMatchSubmissionSchema = z.infer<typeof frcMatchSubmissionSchema>;
