"use server";

import { google } from "googleapis";
import { z } from "zod";
import { type FormValues, formSchema } from "@/schema/scouting";

type SubmissionResult =
  | { success: true; message: string }
  | { success: false; message: string };

export async function submitForm(
  data: FormValues,
  spreadsheetId?: string,
  sheetId?: string
): Promise<SubmissionResult> {
  if (!(spreadsheetId && sheetId)) {
    return {
      success: false,
      message: "Spreadsheet config is missing",
    };
  }

  try {
    const validatedData = formSchema.parse(data);

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
            JSON.stringify(validatedData.tags),
          ],
        ],
      },
      spreadsheetId,
      valueInputOption: "RAW",
    });

    return { success: true, message: "Form submitted successfully" };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join(", ");
      return { success: false, message: `Validation failed: ${errors}` };
    }

    const message =
      error instanceof Error ? error.message : "Unknown error occurred.";
    return { success: false, message: `Form submission failed: ${message}` };
  }
}
