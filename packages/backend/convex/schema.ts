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
});
