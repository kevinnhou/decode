import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { requireUserProfile } from "./auth";
import {
  allianceColourValidator,
  competitionTypeValidator,
  inputModeValidator,
  matchStageValidator,
  sourceValidator,
} from "./schema";
import { normaliseCode } from "./utils/normaliseCode";

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
    const eventCode = normaliseCode(args.eventCode);

    // attach attribution
    const now = Date.now();
    const submissionId = await ctx.db.insert("matchSubmissions", {
      organisationId: profile.organisationId,
      competitionType: "FTC",
      eventCode,
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

const ftcMatchFieldEventValidator = v.object({
  event: v.string(),
  coordinates: v.object({
    x: v.number(),
    y: v.number(),
  }),
  timestamp: v.string(),
  count: v.number(),
});

const ftcPeriodDataValidator = v.object({
  auto: v.object({ made: v.number(), missed: v.number() }),
  teleop: v.object({ made: v.number(), missed: v.number() }),
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
    const eventCode = normaliseCode(args.eventCode);

    const inputMode = args.periodData !== undefined ? "form" : "field";

    const now = Date.now();
    const submissionId = await ctx.db.insert("matchSubmissions", {
      organisationId: profile.organisationId,
      competitionType: "FRC",
      eventCode,
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
    const eventCode = normaliseCode(args.eventCode);

    // attach attribution
    const now = Date.now();
    const submissionId = await ctx.db.insert("pitSubmissions", {
      organisationId: profile.organisationId,
      competitionType: args.competitionType,
      eventCode,
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
    const eventCode = normaliseCode(args.eventCode);

    const submissions = await ctx.db
      .query("matchSubmissions")
      .withIndex("by_org_and_event", (q) =>
        q
          .eq("organisationId", profile.organisationId)
          .eq("eventCode", eventCode)
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
    const eventCode = normaliseCode(args.eventCode);

    const submissions = await ctx.db
      .query("pitSubmissions")
      .withIndex("by_org_and_event", (q) =>
        q
          .eq("organisationId", profile.organisationId)
          .eq("eventCode", eventCode)
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
    const eventCode = normaliseCode(args.eventCode);

    const submissions = await ctx.db
      .query("pitSubmissions")
      .withIndex("by_org_and_event", (q) =>
        q
          .eq("organisationId", profile.organisationId)
          .eq("eventCode", eventCode)
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

/**
 * Update fields on an existing pit submission for the current organisation.
 * When `photos` is provided, it replaces the full list and removed storage IDs are deleted.
 *
 * @param ctx - Convex mutation context
 * @param args - Pit submission id and optional field updates
 */
export const updatePitSubmission = mutation({
  args: {
    pitSubmissionId: v.id("pitSubmissions"),
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
    canShootDeep: v.optional(v.boolean()),
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
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: optional-field patch list
  async handler(ctx, args) {
    const { profile } = await requireUserProfile(ctx);
    const existing = await ctx.db.get(args.pitSubmissionId);
    if (!existing || existing.organisationId !== profile.organisationId) {
      throw new Error("Pit submission not found or access denied");
    }

    const { pitSubmissionId, ...fields } = args;
    const oldPhotos = existing.photos ?? [];

    if (fields.photos !== undefined) {
      for (const id of oldPhotos) {
        if (!fields.photos.includes(id)) {
          try {
            await ctx.storage.delete(id as Id<"_storage">);
          } catch {
            // ignore missing or invalid storage ids
          }
        }
      }
    }

    const now = Date.now();
    const patch: Record<string, unknown> = { updatedAt: now };
    if (fields.robotDimensions !== undefined) {
      patch.robotDimensions = fields.robotDimensions;
    }
    if (fields.drivetrainType !== undefined) {
      patch.drivetrainType = fields.drivetrainType;
    }
    if (fields.photos !== undefined) {
      patch.photos = fields.photos;
    }
    if (fields.notes !== undefined) {
      patch.notes = fields.notes;
    }
    if (fields.canShootDeep !== undefined) {
      patch.canShootDeep = fields.canShootDeep;
    }
    if (fields.hopperCapacity !== undefined) {
      patch.hopperCapacity = fields.hopperCapacity;
    }
    if (fields.shootingSpeed !== undefined) {
      patch.shootingSpeed = fields.shootingSpeed;
    }
    if (fields.intakeMethods !== undefined) {
      patch.intakeMethods = fields.intakeMethods;
    }
    if (fields.canPassTrench !== undefined) {
      patch.canPassTrench = fields.canPassTrench;
    }
    if (fields.canCrossBump !== undefined) {
      patch.canCrossBump = fields.canCrossBump;
    }
    if (fields.maxClimbLevel !== undefined) {
      patch.maxClimbLevel = fields.maxClimbLevel;
    }
    if (fields.autoCapabilities !== undefined) {
      patch.autoCapabilities = fields.autoCapabilities;
    }
    if (fields.weight !== undefined) {
      patch.weight = fields.weight;
    }

    await ctx.db.patch(pitSubmissionId, patch as never);
  },
});

/**
 * Update fields on an existing match submission for the current organisation.
 *
 * @param ctx - Convex mutation context
 * @param args - Match submission id and optional field updates
 */
export const updateMatchSubmission = mutation({
  args: {
    matchSubmissionId: v.id("matchSubmissions"),
    notes: v.optional(v.string()),
    climbLevel: v.optional(
      v.union(v.literal(0), v.literal(1), v.literal(2), v.literal(3))
    ),
    climbDuration: v.optional(v.number()),
    periodData: v.optional(periodDataValidator),
    frcFieldEvents: v.optional(v.array(frcFieldEventValidator)),
    autoPath: v.optional(v.array(frcAutoPathPointValidator)),
    ftcPeriodData: v.optional(ftcPeriodDataValidator),
    autonomousMade: v.optional(v.number()),
    autonomousMissed: v.optional(v.number()),
    teleopMade: v.optional(v.number()),
    teleopMissed: v.optional(v.number()),
    tags: v.optional(v.array(v.string())),
    fieldEvents: v.optional(v.array(ftcMatchFieldEventValidator)),
  },
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: optional-field patch list
  async handler(ctx, args) {
    const { profile } = await requireUserProfile(ctx);
    const existing = await ctx.db.get(args.matchSubmissionId);
    if (!existing || existing.organisationId !== profile.organisationId) {
      throw new Error("Match submission not found or access denied");
    }

    const { matchSubmissionId, ...rest } = args;
    const now = Date.now();
    const patch: Record<string, unknown> = { updatedAt: now };

    if (rest.notes !== undefined) {
      patch.notes = rest.notes;
    }
    if (rest.climbLevel !== undefined) {
      patch.climbLevel = rest.climbLevel;
    }
    if (rest.climbDuration !== undefined) {
      patch.climbDuration = rest.climbDuration;
    }
    if (rest.periodData !== undefined) {
      patch.periodData = rest.periodData;
    }
    if (rest.frcFieldEvents !== undefined) {
      patch.frcFieldEvents = rest.frcFieldEvents;
    }
    if (rest.autoPath !== undefined) {
      patch.autoPath = rest.autoPath;
    }
    if (rest.tags !== undefined) {
      patch.tags = rest.tags;
    }
    if (rest.fieldEvents !== undefined) {
      patch.fieldEvents = rest.fieldEvents;
    }

    if (rest.ftcPeriodData !== undefined) {
      patch.ftcPeriodData = rest.ftcPeriodData;
      patch.autonomousMade = rest.ftcPeriodData.auto.made;
      patch.autonomousMissed = rest.ftcPeriodData.auto.missed;
      patch.teleopMade = rest.ftcPeriodData.teleop.made;
      patch.teleopMissed = rest.ftcPeriodData.teleop.missed;
    } else {
      if (rest.autonomousMade !== undefined) {
        patch.autonomousMade = rest.autonomousMade;
      }
      if (rest.autonomousMissed !== undefined) {
        patch.autonomousMissed = rest.autonomousMissed;
      }
      if (rest.teleopMade !== undefined) {
        patch.teleopMade = rest.teleopMade;
      }
      if (rest.teleopMissed !== undefined) {
        patch.teleopMissed = rest.teleopMissed;
      }
    }

    await ctx.db.patch(matchSubmissionId, patch as never);
  },
});
