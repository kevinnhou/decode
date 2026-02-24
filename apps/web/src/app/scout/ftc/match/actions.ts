"use server";

import { api } from "@decode/backend/convex/_generated/api";
import { google } from "googleapis";
import { z } from "zod";
import { fetchAuthMutation, isAuthenticated } from "@/lib/convex";
import {
  type UnifiedSubmissionSchema,
  unifiedSubmissionSchema,
} from "@/schema/scouting";

type SubmissionResult =
  | { success: true; message: string }
  | { success: false; message: string };

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex submission flow with Convex persistence and optional Sheets export
export async function submitUnified(
  data: UnifiedSubmissionSchema,
  eventCode: string,
  spreadsheetId?: string,
  sheetId?: string
): Promise<SubmissionResult> {
  // --- Auth gate: require authenticated user with a profile ---
  if (!(await isAuthenticated())) {
    return {
      success: false,
      message: "You must be signed in and belong to an organisation to submit.",
    };
  }

  try {
    const validatedData = unifiedSubmissionSchema.parse(data);

    // --- Primary: Persist to Convex ---
    const submissionId = await fetchAuthMutation(
      api.submissions.submitMatchFTC,
      {
        eventCode,
        eventName: undefined,
        teamNumber: validatedData.meta.teamNumber,
        matchNumber: validatedData.meta.qualification,
        matchStage: "qual",
        allianceColour: validatedData.meta.allianceColour ?? "Red",
        inputMode: validatedData.fieldEvents ? "field" : "form",
        source: "web",
        autonomousMade: validatedData.autonomousMade,
        autonomousMissed: validatedData.autonomousMissed,
        teleopMade: validatedData.teleopMade,
        teleopMissed: validatedData.teleopMissed,
        tags: validatedData.tags,
        fieldEvents: validatedData.fieldEvents,
      }
    );

    // --- Optional: Export to Google Sheets ---
    if (spreadsheetId && sheetId) {
      try {
        const auth = new google.auth.GoogleAuth({
          credentials: {
            client_email: process.env.GOOGLE_CLIENT_EMAIL,
            client_id: process.env.GOOGLE_CLIENT_ID,
            private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
          },
          scopes: [
            "https://www.googleapis.com/auth/drive",
            "https://www.googleapis.com/auth/drive.file",
            "https://www.googleapis.com/auth/spreadsheets",
          ],
        });

        const sheets = google.sheets({ auth, version: "v4" });

        await sheets.spreadsheets.values.append({
          range: sheetId,
          requestBody: {
            values: [
              [
                validatedData.meta.teamNumber,
                validatedData.meta.qualification,
                validatedData.meta.teamName ?? "",
                validatedData.meta.allianceColour ?? "",
                validatedData.autonomousMissed,
                validatedData.autonomousMade,
                validatedData.teleopMissed,
                validatedData.teleopMade,
                validatedData.tags.join(", "),
                validatedData.fieldEvents
                  ? JSON.stringify(validatedData.fieldEvents)
                  : "",
                submissionId,
              ],
            ],
          },
          spreadsheetId,
          valueInputOption: "RAW",
        });
      } catch (sheetsError) {
        // Log but don't fail - Convex is primary storage
        console.error("Sheets export failed:", sheetsError);
      }
    }

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
