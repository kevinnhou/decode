import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { getAuthUser, requireRole, requireUserProfile } from "./auth";
import { allianceColourValidator, delegationTypeValidator } from "./schema";

async function assertScoutingConflictDuty(
  ctx: MutationCtx,
  params: {
    organisationId: Id<"organisations">;
    eventCode: string;
    scoutUserId: string;
    delegationType: "team" | "position";
    teamNumber?: number;
    allianceColour?: "Red" | "Blue";
    alliancePosition?: number;
  }
) {
  const {
    organisationId,
    eventCode,
    scoutUserId,
    delegationType,
    teamNumber,
    allianceColour,
    alliancePosition,
  } = params;

  const existing = await ctx.db
    .query("scoutingDuties")
    .withIndex("by_org_event_scout", (q) =>
      q
        .eq("organisationId", organisationId)
        .eq("eventCode", eventCode)
        .eq("scout", scoutUserId)
    )
    .collect();

  const active = existing.filter((d) => d.deletedAt === undefined);

  if (delegationType === "team" && teamNumber !== undefined) {
    const clash = active.find(
      (d) => d.delegationType === "team" && d.teamNumber === teamNumber
    );
    if (clash) {
      throw new ConvexError(
        `This scout is already assigned to team ${teamNumber} for this event`
      );
    }
  }

  if (
    delegationType === "position" &&
    allianceColour !== undefined &&
    alliancePosition !== undefined
  ) {
    const clash = active.find(
      (d) =>
        d.delegationType === "position" &&
        d.allianceColour === allianceColour &&
        d.alliancePosition === alliancePosition
    );
    if (clash) {
      throw new ConvexError(
        `${allianceColour} ${alliancePosition} is already assigned to this scout for this event`
      );
    }
  }
}

async function assertScoutInOrg(
  ctx: MutationCtx,
  scoutUserId: string,
  organisationId: Id<"organisations">
) {
  const scoutProfile = await ctx.db
    .query("userProfiles")
    .withIndex("by_userId", (q) => q.eq("userId", scoutUserId))
    .unique();

  if (!scoutProfile) {
    throw new ConvexError("Scout not found");
  }

  if (scoutProfile.organisationId.toString() !== organisationId.toString()) {
    throw new ConvexError("Scout must be in the same organisation");
  }
}

function validateCreateDutyArgs(args: {
  delegationType: "team" | "position";
  teamNumber?: number;
  allianceColour?: "Red" | "Blue";
  alliancePosition?: number;
}) {
  if (args.delegationType === "team") {
    if (args.teamNumber === undefined || args.teamNumber === null) {
      throw new ConvexError("Team number is required for team-based duty");
    }
    if (args.teamNumber < 1) {
      throw new ConvexError("Team number must be positive");
    }
  } else {
    if (
      args.allianceColour === undefined ||
      args.alliancePosition === undefined
    ) {
      throw new ConvexError(
        "Alliance colour and position are required for position-based duty"
      );
    }
    if (args.alliancePosition < 1 || args.alliancePosition > 3) {
      throw new ConvexError("Alliance position must be 1, 2, or 3");
    }
  }
}

/**
 * Lists scouting duties for an event. Excludes soft-deleted duties.
 * Caller must be leadScout or admin in the same organisation.
 *
 * @param ctx - The Convex query context
 * @param args.organisationId - Organisation ID
 * @param args.eventCode - Event code (e.g. "2025AUSC")
 * @returns Array of duties for the event
 */
export const listDutiesForEvent = query({
  args: {
    organisationId: v.id("organisations"),
    eventCode: v.string(),
  },
  returns: v.any(),
  async handler(ctx, args) {
    const { profile } = await requireRole(ctx, "leadScout");

    if (profile.organisationId.toString() !== args.organisationId.toString()) {
      throw new ConvexError("Organisation mismatch");
    }

    if (!args.eventCode.trim()) {
      return [];
    }

    const duties = await ctx.db
      .query("scoutingDuties")
      .withIndex("by_org_and_event", (q) =>
        q
          .eq("organisationId", args.organisationId)
          .eq("eventCode", args.eventCode.trim())
      )
      .collect();

    return duties.filter((d) => d.deletedAt === undefined);
  },
});

/**
 * Lists the current scout's active duties for an event. Used in match form and scout view.
 *
 * @param ctx - The Convex query context
 * @param args.eventCode - Event code from config
 * @returns Array of active duties for the current scout, or null if not authenticated
 */
export const listMyDuties = query({
  args: {
    eventCode: v.string(),
  },
  returns: v.any(),
  async handler(ctx, args) {
    const authUser = await getAuthUser(ctx);
    if (!authUser) {
      return null;
    }

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", authUser._id))
      .unique();

    if (!profile) {
      return null;
    }

    if (!args.eventCode.trim()) {
      return [];
    }

    const duties = await ctx.db
      .query("scoutingDuties")
      .withIndex("by_org_event_scout", (q) =>
        q
          .eq("organisationId", profile.organisationId)
          .eq("eventCode", args.eventCode.trim())
          .eq("scout", authUser._id)
      )
      .collect();

    return duties.filter((d) => d.deletedAt === undefined && d.isActive);
  },
});

/**
 * Returns org members eligible for assignment (scout, leadScout, admin roles).
 *
 * @param ctx - The Convex query context
 * @param _args - No arguments
 * @returns Array of members with userId, displayName, role
 */
export const getScoutsForOrg = query({
  args: {},
  returns: v.any(),
  async handler(ctx, _args) {
    const { profile } = await requireUserProfile(ctx);

    const members = await ctx.db
      .query("userProfiles")
      .withIndex("by_organisationId", (q) =>
        q.eq("organisationId", profile.organisationId)
      )
      .collect();

    const eligibleRoles = ["scout", "leadScout", "admin"];
    return members
      .filter((m) => eligibleRoles.includes(m.role))
      .map((m) => ({
        userId: m.userId,
        displayName: m.displayName,
        role: m.role,
      }));
  },
});

const createDutyArgs = {
  organisationId: v.id("organisations"),
  eventCode: v.string(),
  scout: v.string(),
  delegationType: delegationTypeValidator,
  teamNumber: v.optional(v.number()),
  allianceColour: v.optional(allianceColourValidator),
  alliancePosition: v.optional(v.number()),
};

/**
 * Creates a scouting duty. Caller must be leadScout or admin.
 * Validates: scout in same org; the same scout cannot receive duplicate duties
 * for the same team number or alliance slot in one event (multiple scouts may
 * share a team or position).
 *
 * @param ctx - The Convex mutation context
 * @param args - Duty creation args
 * @returns The new duty ID
 */
export const createDuty = mutation({
  args: createDutyArgs,
  returns: v.id("scoutingDuties"),
  async handler(ctx, args) {
    const { authUser, profile } = await requireRole(ctx, "leadScout");

    if (profile.organisationId.toString() !== args.organisationId.toString()) {
      throw new ConvexError("Organisation mismatch");
    }

    if (!args.eventCode.trim()) {
      throw new ConvexError("Event code is required");
    }

    await assertScoutInOrg(ctx, args.scout, profile.organisationId);
    validateCreateDutyArgs(args);

    await assertScoutingConflictDuty(ctx, {
      organisationId: args.organisationId,
      eventCode: args.eventCode.trim(),
      scoutUserId: args.scout,
      delegationType: args.delegationType,
      teamNumber: args.teamNumber,
      allianceColour: args.allianceColour,
      alliancePosition: args.alliancePosition,
    });

    const now = Date.now();

    return await ctx.db.insert("scoutingDuties", {
      organisationId: args.organisationId,
      eventCode: args.eventCode.trim(),
      scout: args.scout,
      assignedBy: authUser._id,
      delegationType: args.delegationType,
      teamNumber: args.delegationType === "team" ? args.teamNumber : undefined,
      allianceColour:
        args.delegationType === "position" ? args.allianceColour : undefined,
      alliancePosition:
        args.delegationType === "position" ? args.alliancePosition : undefined,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Updates a scouting duty. Caller must be leadScout or admin in same org.
 *
 * @param ctx - The Convex mutation context
 * @param args - Duty ID and update fields
 */
export const updateDuty = mutation({
  args: {
    dutyId: v.id("scoutingDuties"),
    scout: v.optional(v.string()),
    delegationType: v.optional(delegationTypeValidator),
    teamNumber: v.optional(v.number()),
    allianceColour: v.optional(allianceColourValidator),
    alliancePosition: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  returns: v.null(),
  async handler(ctx, args) {
    const { authUser, profile } = await requireRole(ctx, "leadScout");

    const duty = await ctx.db.get(args.dutyId);
    if (!duty) {
      throw new ConvexError("Duty not found");
    }

    if (duty.deletedAt !== undefined) {
      throw new ConvexError("Cannot update a deleted duty");
    }

    if (duty.organisationId.toString() !== profile.organisationId.toString()) {
      throw new ConvexError("Duty does not belong to your organisation");
    }

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
      updatedBy: authUser._id,
    };

    if (args.scout !== undefined) {
      const scoutId = args.scout;
      const scoutProfile = await ctx.db
        .query("userProfiles")
        .withIndex("by_userId", (q) => q.eq("userId", scoutId))
        .unique();
      if (!scoutProfile) {
        throw new ConvexError("Scout not found");
      }
      if (
        scoutProfile.organisationId.toString() !==
        profile.organisationId.toString()
      ) {
        throw new ConvexError("Scout must be in the same organisation");
      }
      updates.scout = args.scout;
    }

    if (args.delegationType !== undefined) {
      updates.delegationType = args.delegationType;
    }

    if (args.teamNumber !== undefined) {
      updates.teamNumber = args.teamNumber;
    }

    if (args.allianceColour !== undefined) {
      updates.allianceColour = args.allianceColour;
    }

    if (args.alliancePosition !== undefined) {
      updates.alliancePosition = args.alliancePosition;
    }

    if (args.isActive !== undefined) {
      updates.isActive = args.isActive;
    }

    await ctx.db.patch(args.dutyId, updates);
    return null;
  },
});

/**
 * Soft-deletes a scouting duty. Caller must be leadScout or admin in same org.
 *
 * @param ctx - The Convex mutation context
 * @param args.dutyId - Duty ID to delete
 */
export const deleteDuty = mutation({
  args: {
    dutyId: v.id("scoutingDuties"),
  },
  returns: v.null(),
  async handler(ctx, args) {
    const { profile } = await requireRole(ctx, "leadScout");

    const duty = await ctx.db.get(args.dutyId);
    if (!duty) {
      throw new ConvexError("Duty not found");
    }

    if (duty.organisationId.toString() !== profile.organisationId.toString()) {
      throw new ConvexError("Duty does not belong to your organisation");
    }

    await ctx.db.patch(args.dutyId, {
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });
    return null;
  },
});
