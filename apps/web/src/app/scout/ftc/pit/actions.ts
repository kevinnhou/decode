"use server";

import { api } from "@decode/backend/convex/_generated/api";
import { fetchAuthMutation, isAuthenticated } from "@/lib/convex";
import type { SubmissionResult } from "@/lib/form/types";

export async function getPhotoUploadUrl(): Promise<
  SubmissionResult & { uploadUrl?: string }
> {
  if (!(await isAuthenticated())) {
    return {
      success: false,
      message: "You must be signed in to upload photos.",
    };
  }

  try {
    const uploadUrl = await fetchAuthMutation(
      api.submissions.generatePitPhotoUploadUrl,
      {}
    );
    return { success: true, message: "Upload URL generated", uploadUrl };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate upload URL";
    return { success: false, message };
  }
}

type SubmitPitArgs = {
  competitionType: "FTC";
  eventCode: string;
  eventName?: string;
  teamNumber: number;
  source?: "web";
  robotDimensions?: { length: number; width: number; height: number };
  drivetrainType?: "swerve" | "tank" | "other";
  photos?: string[];
  notes?: string;
  intakeMethods?: ("floor" | "depot" | "outpost")[];
  maxClimbLevel?: 0 | 1 | 2 | 3;
  canShootDeep?: boolean;
  autoCapabilities?: string;
  weight?: number;
};

export async function submitPit(
  args: SubmitPitArgs
): Promise<SubmissionResult> {
  if (!(await isAuthenticated())) {
    return {
      success: false,
      message: "You must be signed in to submit pit scouting.",
    };
  }

  try {
    await fetchAuthMutation(api.submissions.submitPit, args);
    return { success: true, message: "Pit scouting submitted successfully" };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to submit pit scouting";
    return { success: false, message };
  }
}
