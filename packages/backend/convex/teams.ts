import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireRole, requireUserProfile } from "./auth";

/**
 * Saves (upserts) a team number → name map for the given event, scoped to the
 * caller's organisation. Replaces any existing map for that event.
 *
 * @param ctx - The Convex mutation context
 * @param args.eventCode - The event code to associate this map with (e.g. "2025AZPHE")
 * @param args.map - Record mapping team number strings to team name strings
 * @returns The id of the upserted teamMaps document
 * @throws ConvexError if the caller lacks leadScout or admin role
 */
export const saveTeamsMap = mutation({
  args: {
    eventCode: v.string(),
    map: v.any(),
  },
  returns: v.id("teamMaps"),
  async handler(ctx, args) {
    const { authUser, profile } = await requireRole(ctx, "leadScout");

    const existing = await ctx.db
      .query("teamMaps")
      .withIndex("by_org_event", (q) =>
        q
          .eq("organisationId", profile.organisationId)
          .eq("eventCode", args.eventCode)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        map: args.map,
        importedBy: authUser._id,
        importedAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("teamMaps", {
      organisationId: profile.organisationId,
      eventCode: args.eventCode,
      map: args.map,
      importedBy: authUser._id,
      importedAt: Date.now(),
    });
  },
});

/**
 * Returns the team map for the given event in the caller's organisation, or
 * null if no map has been imported yet.
 *
 * @param ctx - The Convex query context
 * @param args.eventCode - The event code to look up
 * @returns The teamMaps document, or null if none exists
 * @throws ConvexError if the caller is not authenticated or has no profile
 */
export const getTeamsMapForEvent = query({
  args: {
    eventCode: v.string(),
  },
  returns: v.union(
    v.object({
      _id: v.id("teamMaps"),
      _creationTime: v.number(),
      organisationId: v.id("organisations"),
      eventCode: v.string(),
      map: v.any(),
      importedBy: v.string(),
      importedAt: v.number(),
    }),
    v.null()
  ),
  async handler(ctx, args) {
    const { profile } = await requireUserProfile(ctx);

    if (!args.eventCode.trim()) {
      return null;
    }

    return await ctx.db
      .query("teamMaps")
      .withIndex("by_org_event", (q) =>
        q
          .eq("organisationId", profile.organisationId)
          .eq("eventCode", args.eventCode)
      )
      .unique();
  },
});
