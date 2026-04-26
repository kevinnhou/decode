import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
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
    ftcPeriodData: v.optional(
      v.object({
        auto: v.object({ made: v.number(), missed: v.number() }),
        teleop: v.object({ made: v.number(), missed: v.number() }),
      })
    ),
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
      ftcPeriodData: args.ftcPeriodData,
      tags: args.tags,
      fieldEvents: args.fieldEvents,
      createdAt: now,
      updatedAt: now,
    });

    return submissionId;
  },
});

const frcFieldEventValidator = v.object({
  coordinates: v.object({ x: v.number(), y: v.number() }),
  startTimestamp: v.string(),
  endTimestamp: v.string(),
  duration: v.number(),
  period: v.union(
    v.literal("AUTO"),
    v.literal("TRANSITION"),
    v.literal("SHIFT_1"),
    v.literal("SHIFT_2"),
    v.literal("SHIFT_3"),
    v.literal("SHIFT_4"),
    v.literal("END_GAME")
  ),
  eventType: v.union(
    v.literal("shooting"),
    v.literal("intake"),
    v.literal("defense"),
    v.literal("climb")
  ),
  action: v.optional(v.union(v.literal("scoring"), v.literal("feeding"))),
  source: v.optional(
    v.union(v.literal("floor"), v.literal("depot"), v.literal("outpost"))
  ),
  climbLevel: v.optional(v.union(v.literal(1), v.literal(2), v.literal(3))),
});

const frcAutoPathPointValidator = v.object({
  coordinates: v.object({ x: v.number(), y: v.number() }),
  timestamp: v.string(),
});

const periodDataValidator = v.object({
  auto: v.object({
    scoring: v.number(),
    feeding: v.number(),
    defense: v.number(),
  }),
  transition: v.object({
    scoring: v.number(),
    feeding: v.number(),
    defense: v.number(),
  }),
  shift1: v.object({
    scoring: v.number(),
    feeding: v.number(),
    defense: v.number(),
  }),
  shift2: v.object({
    scoring: v.number(),
    feeding: v.number(),
    defense: v.number(),
  }),
  shift3: v.object({
    scoring: v.number(),
    feeding: v.number(),
    defense: v.number(),
  }),
  shift4: v.object({
    scoring: v.number(),
    feeding: v.number(),
    defense: v.number(),
  }),
  endGame: v.object({
    scoring: v.number(),
    feeding: v.number(),
    defense: v.number(),
  }),
});

/**
 * Submit an FRC match scouting record.
 * Server-side attribution (organisationId, scoutUserId, scoutName) is attached from the authenticated user profile.
 *
 * @param ctx - The Convex mutation context
 * @param args - Match submission data from the client
 * @returns The newly created match submission ID
 */
export const submitMatch = mutation({
  args: {
    eventCode: v.string(),
    eventName: v.optional(v.string()),
    teamNumber: v.number(),
    matchNumber: v.number(),
    matchStage: matchStageValidator,
    allianceColour: allianceColourValidator,
    source: v.optional(sourceValidator),
    // FRC match fields
    climbLevel: v.union(v.literal(0), v.literal(1), v.literal(2), v.literal(3)),
    climbDuration: v.number(),
    notes: v.optional(v.string()),
    // Form mode
    periodData: v.optional(periodDataValidator),
    // Field mode
    frcFieldEvents: v.optional(v.array(frcFieldEventValidator)),
    autoPath: v.optional(v.array(frcAutoPathPointValidator)),
  },
  async handler(ctx, args) {
    const { profile } = await requireUserProfile(ctx);

    const inputMode = args.periodData !== undefined ? "form" : "field";

    const now = Date.now();
    const submissionId = await ctx.db.insert("matchSubmissions", {
      organisationId: profile.organisationId,
      competitionType: "FRC",
      eventCode: args.eventCode,
      eventName: args.eventName,
      teamNumber: args.teamNumber,
      scoutUserId: profile.userId,
      scoutName: profile.displayName,
      source: args.source,
      matchNumber: args.matchNumber,
      matchStage: args.matchStage,
      allianceColour: args.allianceColour,
      inputMode,
      climbLevel: args.climbLevel,
      climbDuration: args.climbDuration,
      periodData: args.periodData,
      frcFieldEvents: args.frcFieldEvents,
      autoPath: args.autoPath,
      notes: args.notes,
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
      v.union(v.literal("swerve"), v.literal("tank"), v.literal("other"))
    ),
    photos: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
    // FTC pit fields
    canShootDeep: v.optional(v.boolean()),
    // FRC pit fields
    hopperCapacity: v.optional(v.number()),
    shootingSpeed: v.optional(v.number()),
    intakeMethods: v.optional(
      v.array(
        v.union(v.literal("floor"), v.literal("depot"), v.literal("outpost"))
      )
    ),
    canPassTrench: v.optional(v.boolean()),
    canCrossBump: v.optional(v.boolean()),
    maxClimbLevel: v.optional(
      v.union(v.literal(0), v.literal(1), v.literal(2), v.literal(3))
    ),
    autoCapabilities: v.optional(v.string()),
    weight: v.optional(v.number()),
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
      // FTC pit fields
      canShootDeep: args.canShootDeep,
      // FRC pit fields
      hopperCapacity: args.hopperCapacity,
      shootingSpeed: args.shootingSpeed,
      intakeMethods: args.intakeMethods,
      canPassTrench: args.canPassTrench,
      canCrossBump: args.canCrossBump,
      maxClimbLevel: args.maxClimbLevel,
      autoCapabilities: args.autoCapabilities,
      weight: args.weight,
      createdAt: now,
      updatedAt: now,
    });

    return submissionId;
  },
});

/**
 * Generate an upload URL for pit scouting photos.
 * Requires authentication.
 *
 * @param ctx - The Convex mutation context
 * @returns Upload URL for the file
 */
export const generatePitPhotoUploadUrl = mutation({
  args: {},
  async handler(ctx) {
    await requireUserProfile(ctx);
    return await ctx.storage.generateUploadUrl();
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

/**
 * Get a map of team number → submission count for pit scouting submissions
 * for the current user's organisation and event.
 *
 * @param ctx - The Convex query context
 * @param args - Event code to filter by
 * @returns Record of team number strings to submission counts
 */
export const getPitSubmissionCounts = query({
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

    const counts: Record<string, number> = {};
    for (const s of submissions) {
      const key = String(s.teamNumber);
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  },
});
