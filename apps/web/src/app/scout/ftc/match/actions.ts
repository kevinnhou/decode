"use server";

import { api } from "@decode/backend/convex/_generated/api";
import { google } from "googleapis";
import { z } from "zod";
import { fetchAuthQuery, isAuthenticated } from "@/lib/convex";
import {
  type UnifiedSubmissionSchema,
  unifiedSubmissionSchema,
} from "@/schema/scouting";

type SubmissionResult =
  | { success: true; message: string }
  | { success: false; message: string };

/**
 * Resolve the current scout's attribution from their Convex user profile.
 * Returns null if the user is not authenticated or has no profile.
 */
async function getScoutAttribution() {
  if (!(await isAuthenticated())) {
    return null;
  }

  const profile = await fetchAuthQuery(api.auth.getCurrentUserProfile);
  if (!profile) {
    return null;
  }

  return {
    organisationId: profile.organisationId as string,
    scoutUserId: profile.userId,
    scoutName: profile.displayName,
    createdAt: Date.now(),
  };
}

export async function submitUnified(
  data: UnifiedSubmissionSchema,
  spreadsheetId?: string,
  sheetId?: string
): Promise<SubmissionResult> {
  // --- Auth gate: require authenticated user with a profile ---
  const attribution = await getScoutAttribution();
  if (!attribution) {
    return {
      success: false,
      message: "You must be signed in and belong to an organisation to submit.",
    };
  }

  if (!(spreadsheetId && sheetId)) {
    return {
      success: false,
      message: "Spreadsheet config is missing",
    };
  }

  try {
    const validatedData = unifiedSubmissionSchema.parse(data);

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
            // Scout attribution columns (server-attached)
            attribution.scoutUserId,
            attribution.scoutName,
            attribution.organisationId,
            new Date(attribution.createdAt).toISOString(),
          ],
        ],
      },
      spreadsheetId,
      valueInputOption: "RAW",
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
