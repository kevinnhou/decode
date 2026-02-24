import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// --- Shared validators ---

export const roleValidator = v.union(
  v.literal("admin"),
  v.literal("leadScout"),
  v.literal("scout")
);

export const allianceColourValidator = v.union(
  v.literal("Red"),
  v.literal("Blue")
);

export const delegationTypeValidator = v.union(
  v.literal("team"),
  v.literal("position")
);

export const competitionTypeValidator = v.union(
  v.literal("FTC"),
  v.literal("FRC")
);

export const matchStageValidator = v.union(
  v.literal("practice"),
  v.literal("qual"),
  v.literal("playoff")
);

export const inputModeValidator = v.union(
  v.literal("form"),
  v.literal("field")
);

export const sourceValidator = v.union(v.literal("web"), v.literal("mobile"));

// --- Schema ---

export default defineSchema({
  // Organisations
  organisations: defineTable({
    name: v.string(),
    slug: v.string(),
    inviteCode: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_inviteCode", ["inviteCode"]),

  // User profiles (links Better Auth userId to org + role)
  userProfiles: defineTable({
    userId: v.string(),
    organisationId: v.id("organisations"),
    role: roleValidator,
    displayName: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_organisationId", ["organisationId"])
    .index("by_org_and_role", ["organisationId", "role"]),

  // Scouting duties (scout assignment/delegation)
  scoutingDuties: defineTable({
    organisationId: v.id("organisations"),
    eventCode: v.string(),
    scout: v.string(),
    assignedBy: v.string(),
    delegationType: delegationTypeValidator,
    // Team-based delegation fields
    teamNumber: v.optional(v.number()),
    // Position-based delegation fields
    allianceColour: v.optional(allianceColourValidator),
    alliancePosition: v.optional(v.number()),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_organisationId", ["organisationId"])
    .index("by_org_and_event", ["organisationId", "eventCode"])
    .index("by_scout", ["scout"])
    .index("by_org_event_scout", ["organisationId", "eventCode", "scout"])
    .index("by_assignedBy", ["assignedBy"]),

  // Match scouting submissions
  matchSubmissions: defineTable({
    // Shared base fields
    organisationId: v.id("organisations"),
    competitionType: competitionTypeValidator,
    eventCode: v.string(),
    eventName: v.optional(v.string()),
    teamNumber: v.number(),
    scoutUserId: v.string(),
    scoutName: v.string(),
    source: v.optional(sourceValidator),
    // Match-specific fields
    matchNumber: v.number(),
    matchStage: matchStageValidator,
    allianceColour: allianceColourValidator,
    inputMode: inputModeValidator,
    // FTC match fields
    autonomousMade: v.optional(v.number()),
    autonomousMissed: v.optional(v.number()),
    teleopMade: v.optional(v.number()),
    teleopMissed: v.optional(v.number()),
    tags: v.optional(v.array(v.string())),
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
    // FRC match fields (to be added later)
    // shootingBursts, autoPath, climbLevel, climbDuration, playedDefense, notes
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organisationId", ["organisationId"])
    .index("by_org_and_event", ["organisationId", "eventCode"])
    .index("by_org_event_team", ["organisationId", "eventCode", "teamNumber"])
    .index("by_scout", ["scoutUserId"])
    .index("by_competition_type", ["competitionType"])
    .index("by_event_match", ["eventCode", "matchNumber"]),

  // Pit scouting submissions
  pitSubmissions: defineTable({
    // Shared base fields
    organisationId: v.id("organisations"),
    competitionType: competitionTypeValidator,
    eventCode: v.string(),
    eventName: v.optional(v.string()),
    teamNumber: v.number(),
    scoutUserId: v.string(),
    scoutName: v.string(),
    source: v.optional(sourceValidator),
    // Shared pit fields
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
    // FTC pit fields (to be defined later)
    // FRC pit fields (to be added later)
    // hopperCapacity, shootingSpeed, intakeMethods, canPassTrench, etc.
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organisationId", ["organisationId"])
    .index("by_org_and_event", ["organisationId", "eventCode"])
    .index("by_org_event_team", ["organisationId", "eventCode", "teamNumber"])
    .index("by_scout", ["scoutUserId"])
    .index("by_competition_type", ["competitionType"]),
});
