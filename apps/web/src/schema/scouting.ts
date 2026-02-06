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
  spreadsheetId: z.string().min(1, "Spreadsheet ID is required"),
  sheetId: z.string().min(1, "Sheet ID is required"),
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

/**
 * Full submission payload: client form data + server-attached attribution.
 * The attribution fields are merged server-side in the submit action,
 * not supplied by the client.
 */
export const attributedSubmissionSchema = unifiedSubmissionSchema.merge(
  scoutAttributionSchema
);

export type AttributedSubmissionSchema = z.infer<
  typeof attributedSubmissionSchema
>;
