"use server";

import { api } from "@decode/backend/convex/_generated/api";
import { z } from "zod";
import { fetchAuthMutation, isAuthenticated } from "@/lib/convex";
import {
  type FrcMatchSubmissionSchema,
  frcMatchSubmissionSchema,
} from "@/schema/scouting";

type SubmissionResult =
  | { success: true; message: string }
  | { success: false; message: string };

export async function submitMatch(
  data: FrcMatchSubmissionSchema,
  eventCode: string,
  _spreadsheetId?: string,
  _sheetId?: string
): Promise<SubmissionResult> {
  if (!(await isAuthenticated())) {
    return {
      success: false,
      message: "You must be signed in and belong to an organisation to submit.",
    };
  }

  try {
    const validatedData = frcMatchSubmissionSchema.parse(data);

    await fetchAuthMutation(api.submissions.submitMatch, {
      eventCode,
      eventName: undefined,
      teamNumber: validatedData.meta.teamNumber,
      matchNumber: validatedData.meta.matchNumber,
      matchStage: validatedData.meta.matchStage,
      allianceColour: validatedData.meta.allianceColour,
      source: "web",
      climbLevel: validatedData.climbLevel,
      climbDuration: validatedData.climbDuration,
      notes: validatedData.notes,
      periodData: validatedData.periodData,
      frcFieldEvents: validatedData.frcFieldEvents,
      autoPath: validatedData.autoPath,
    });

    return { success: true, message: "Data submitted successfully" };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join(", ");
      return { success: false, message: `Validation failed: ${errors}` };
    }

    const message =
      error instanceof Error ? error.message : "Unknown error occurred.";
    return { success: false, message: `Submission failed: ${message}` };
  }
}
