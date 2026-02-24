import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireUserProfile } from "./auth";
import {
  allianceColourValidator,
  competitionTypeValidator,
  inputModeValidator,
  matchStageValidator,
  sourceValidator,
} from "./schema";

/**
 * Submit an FTC match scouting record.
 * Server-side attribution (organisationId, scoutUserId, scoutName) is attached from the authenticated user profile.
 *
 * @param ctx - The Convex mutation context
 * @param args - Match submission data from the client
 * @returns The newly created match submission ID
 */
export const submitMatchFTC = mutation({
  args: {
    eventCode: v.string(),
    eventName: v.optional(v.string()),
    teamNumber: v.number(),
    matchNumber: v.number(),
    matchStage: matchStageValidator,
    allianceColour: allianceColourValidator,
    inputMode: inputModeValidator,
    source: v.optional(sourceValidator),
    // FTC match fields
    autonomousMade: v.number(),
    autonomousMissed: v.number(),
    teleopMade: v.number(),
    teleopMissed: v.number(),
    tags: v.array(v.string()),
    fieldEvents: v.optional(
      v.array(
        v.object({
          event: v.string(),
          coordinates: v.object({
            x: v.number(),
            y: v.number(),
          }),
          timestamp: v.string(),
          count: v.number(),
        })
      )
    ),
  },
  async handler(ctx, args) {
    const { profile } = await requireUserProfile(ctx);

    // attach attribution
    const now = Date.now();
    const submissionId = await ctx.db.insert("matchSubmissions", {
      organisationId: profile.organisationId,
      competitionType: "FTC",
      eventCode: args.eventCode,
      eventName: args.eventName,
      teamNumber: args.teamNumber,
      scoutUserId: profile.userId,
      scoutName: profile.displayName,
      source: args.source,
      matchNumber: args.matchNumber,
      matchStage: args.matchStage,
      allianceColour: args.allianceColour,
      inputMode: args.inputMode,
      autonomousMade: args.autonomousMade,
      autonomousMissed: args.autonomousMissed,
      teleopMade: args.teleopMade,
      teleopMissed: args.teleopMissed,
      tags: args.tags,
      fieldEvents: args.fieldEvents,
      createdAt: now,
      updatedAt: now,
    });

    return submissionId;
  },
});

/**
 * Submit a pit scouting record (FTC or FRC).
 * Server-side attribution (organisationId, scoutUserId, scoutName) is attached from the authenticated user profile.
 *
 * @param ctx - The Convex mutation context
 * @param args - Pit submission data from the client
 * @returns The newly created pit submission ID
 */
export const submitPit = mutation({
  args: {
    competitionType: competitionTypeValidator,
    eventCode: v.string(),
    eventName: v.optional(v.string()),
    teamNumber: v.number(),
    source: v.optional(sourceValidator),
    robotDimensions: v.optional(
      v.object({
        length: v.number(),
        width: v.number(),
        height: v.number(),
      })
    ),
    drivetrainType: v.optional(
      v.union(
        v.literal("swerve"),
        v.literal("tank"),
        v.literal("mecanum"),
        v.literal("other")
      )
    ),
    photos: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
  },
  async handler(ctx, args) {
    const { profile } = await requireUserProfile(ctx);

    // attach attribution
    const now = Date.now();
    const submissionId = await ctx.db.insert("pitSubmissions", {
      organisationId: profile.organisationId,
      competitionType: args.competitionType,
      eventCode: args.eventCode,
      eventName: args.eventName,
      teamNumber: args.teamNumber,
      scoutUserId: profile.userId,
      scoutName: profile.displayName,
      source: args.source,
      robotDimensions: args.robotDimensions,
      drivetrainType: args.drivetrainType,
      photos: args.photos,
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });

    return submissionId;
  },
});

/**
 * Query match submissions for the current user's organisation and event.
 *
 * @param ctx - The Convex query context
 * @param args - Event code to filter by
 * @returns Array of match submissions
 */
export const getMatchSubmissions = mutation({
  args: {
    eventCode: v.string(),
  },
  async handler(ctx, args) {
    const { profile } = await requireUserProfile(ctx);

    const submissions = await ctx.db
      .query("matchSubmissions")
      .withIndex("by_org_and_event", (q) =>
        q
          .eq("organisationId", profile.organisationId)
          .eq("eventCode", args.eventCode)
      )
      .collect();

    return submissions;
  },
});

/**
 * Query pit submissions for the current user's organisation and event.
 *
 * @param ctx - The Convex query context
 * @param args - Event code to filter by
 * @returns Array of pit submissions
 */
export const getPitSubmissions = mutation({
  args: {
    eventCode: v.string(),
  },
  async handler(ctx, args) {
    const { profile } = await requireUserProfile(ctx);

    const submissions = await ctx.db
      .query("pitSubmissions")
      .withIndex("by_org_and_event", (q) =>
        q
          .eq("organisationId", profile.organisationId)
          .eq("eventCode", args.eventCode)
      )
      .collect();

    return submissions;
  },
});
