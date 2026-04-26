"use server";

import { api } from "@decode/backend/convex/_generated/api";
import { z } from "zod";
import { fetchAuthMutation, isAuthenticated } from "@/lib/convex";
import type { SubmissionResult } from "@/lib/form/types";
import {
  type FtcMatchSubmissionSchema,
  ftcMatchSubmissionSchema,
} from "@/schema/scouting";

export async function submitMatch(
  data: FtcMatchSubmissionSchema,
  eventCode: string
): Promise<SubmissionResult> {
  if (!(await isAuthenticated())) {
    return {
      success: false,
      message: "You must be signed in and belong to an organisation to submit.",
    };
  }

  try {
    const validatedData = ftcMatchSubmissionSchema.parse(data);
    const pd = validatedData.periodData;

    await fetchAuthMutation(api.submissions.submitMatchFTC, {
      eventCode,
      eventName: undefined,
      teamNumber: validatedData.meta.teamNumber,
      matchNumber: validatedData.meta.matchNumber,
      matchStage: validatedData.meta.matchStage,
      allianceColour: validatedData.meta.allianceColour,
      inputMode: validatedData.inputMode,
      source: "web",
      autonomousMade: pd?.auto.made ?? 0,
      autonomousMissed: pd?.auto.missed ?? 0,
      teleopMade: pd?.teleop.made ?? 0,
      teleopMissed: pd?.teleop.missed ?? 0,
      ftcPeriodData: pd,
      tags: [],
      fieldEvents: validatedData.ftcFieldEvents,
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
