"use server";

import { api } from "@decode/backend/convex/_generated/api";
import { fetchAuthMutation, isAuthenticated } from "@/lib/convex";

export async function getPhotoUploadUrl(): Promise<string> {
  if (!(await isAuthenticated())) {
    throw new Error("You must be signed in to upload photos.");
  }
  return await fetchAuthMutation(api.submissions.generatePitPhotoUploadUrl, {});
}

type SubmitPitArgs = {
  competitionType: "FRC";
  eventCode: string;
  eventName?: string;
  teamNumber: number;
  source?: "web";
  robotDimensions?: { length: number; width: number; height: number };
  drivetrainType?: "swerve" | "tank" | "other";
  photos?: string[];
  notes?: string;
  hopperCapacity?: number;
  shootingSpeed?: number;
  intakeMethods?: ("floor" | "depot" | "outpost")[];
  canPassTrench?: boolean;
  canCrossBump?: boolean;
  maxClimbLevel?: 0 | 1 | 2 | 3;
  autoCapabilities?: string;
  weight?: number;
};

export async function submitPit(args: SubmitPitArgs): Promise<string> {
  if (!(await isAuthenticated())) {
    throw new Error("You must be signed in to submit pit scouting.");
  }
  return await fetchAuthMutation(api.submissions.submitPit, args);
}
