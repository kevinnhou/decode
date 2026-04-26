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
    updatedAt: v.number(),
    updatedBy: v.optional(v.string()),
    deletedAt: v.optional(v.number()),
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
    ftcPeriodData: v.optional(
      v.object({
        auto: v.object({ made: v.number(), missed: v.number() }),
        teleop: v.object({ made: v.number(), missed: v.number() }),
      })
    ),
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
    // FRC match fields (form mode)
    climbLevel: v.optional(
      v.union(v.literal(0), v.literal(1), v.literal(2), v.literal(3))
    ),
    climbDuration: v.optional(v.number()),
    // FRC match fields (field mode)
    frcFieldEvents: v.optional(
      v.array(
        v.object({
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
          action: v.optional(
            v.union(v.literal("scoring"), v.literal("feeding"))
          ),
          source: v.optional(
            v.union(
              v.literal("floor"),
              v.literal("depot"),
              v.literal("outpost")
            )
          ),
          climbLevel: v.optional(
            v.union(v.literal(1), v.literal(2), v.literal(3))
          ),
        })
      )
    ),
    autoPath: v.optional(
      v.array(
        v.object({
          coordinates: v.object({ x: v.number(), y: v.number() }),
          timestamp: v.string(),
        })
      )
    ),
    periodData: v.optional(
      v.object({
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
      })
    ),
    notes: v.optional(v.string()),
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
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organisationId", ["organisationId"])
    .index("by_org_and_event", ["organisationId", "eventCode"])
    .index("by_org_event_team", ["organisationId", "eventCode", "teamNumber"])
    .index("by_scout", ["scoutUserId"])
    .index("by_competition_type", ["competitionType"]),

  teamMaps: defineTable({
    organisationId: v.id("organisations"),
    eventCode: v.string(),
    map: v.any(),
    importedBy: v.string(), // userId of the lead scout / admin
    importedAt: v.number(),
  }).index("by_org_event", ["organisationId", "eventCode"]),

  firstApiEvents: defineTable({
    eventCode: v.string(),
    season: v.number(),
    name: v.string(),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    city: v.optional(v.string()),
    stateProv: v.optional(v.string()),
    country: v.optional(v.string()),
    cachedAt: v.number(),
  })
    .index("by_eventCode", ["eventCode"])
    .index("by_season", ["season"]),

  firstApiTeams: defineTable({
    eventCode: v.string(),
    teamNumber: v.number(),
    teamName: v.optional(v.string()),
    cachedAt: v.number(),
  })
    .index("by_eventCode", ["eventCode"])
    .index("by_event_team", ["eventCode", "teamNumber"]),

  firstApiSchedule: defineTable({
    eventCode: v.string(),
    matchNumber: v.number(),
    matchType: v.string(),
    red1: v.optional(v.number()),
    red2: v.optional(v.number()),
    red3: v.optional(v.number()),
    blue1: v.optional(v.number()),
    blue2: v.optional(v.number()),
    blue3: v.optional(v.number()),
    cachedAt: v.number(),
  })
    .index("by_eventCode", ["eventCode"])
    .index("by_event_match", ["eventCode", "matchNumber"]),
});
