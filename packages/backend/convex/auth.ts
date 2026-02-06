/** biome-ignore-all lint/suspicious/noExplicitAny: PASS */
import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth";
import { ConvexError, v } from "convex/values";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { roleValidator } from "./schema";

// biome-ignore lint/style/noNonNullAssertion: PASS
const siteUrl = process.env.SITE_URL!;

export const authComponent = createClient<DataModel>(components.betterAuth);

function createAuth(
  ctx: GenericCtx<DataModel>,
  { optionsOnly }: { optionsOnly?: boolean } = { optionsOnly: false }
) {
  return betterAuth({
    logger: {
      disabled: optionsOnly,
    },
    baseURL: siteUrl,
    trustedOrigins: [siteUrl],
    database: authComponent.adapter(ctx as any),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    plugins: [convex()],
  });
}

export { createAuth };

// --- Auth queries ---

export const getCurrentUser = query({
  args: {},
  returns: v.any(),
  async handler(ctx, _args) {
    return await authComponent.getAuthUser(ctx as any);
  },
});

export const getCurrentUserProfile = query({
  args: {},
  returns: v.any(),
  async handler(ctx, _args) {
    const profile = await resolveUserProfile(ctx);
    return profile;
  },
});

// --- Auth helpers ---

/**
 * Resolve the authenticated Better Auth user. Returns null if not signed in.
 */
export async function getAuthUser(ctx: QueryCtx) {
  return await authComponent.getAuthUser(ctx as any);
}

/**
 * Resolve the current user's profile (userProfiles row).
 * Returns null if no profile exists yet (e.g. user hasn't joined an org).
 */
export async function resolveUserProfile(ctx: QueryCtx) {
  const authUser = await getAuthUser(ctx);
  if (!authUser) {
    return null;
  }

  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("by_userId", (q) => q.eq("userId", authUser._id))
    .unique();

  return profile;
}

/**
 * Require an authenticated user profile. Throws if not signed in or no profile.
 */
export async function requireUserProfile(ctx: QueryCtx) {
  const authUser = await getAuthUser(ctx);
  if (!authUser) {
    throw new ConvexError("Not authenticated");
  }

  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("by_userId", (q) => q.eq("userId", authUser._id))
    .unique();

  if (!profile) {
    throw new ConvexError(
      "No user profile found. Please join an organisation first."
    );
  }

  return { authUser, profile };
}

type Role = "admin" | "leadScout" | "scout";

const ROLE_HIERARCHY: Record<Role, number> = {
  admin: 3,
  leadScout: 2,
  scout: 1,
};

/**
 * Require the user has at least the given role level.
 * admin > leadScout > scout
 */
export async function requireRole(ctx: QueryCtx, minimumRole: Role) {
  const { authUser, profile } = await requireUserProfile(ctx);

  const userLevel = ROLE_HIERARCHY[profile.role as Role] ?? 0;
  const requiredLevel = ROLE_HIERARCHY[minimumRole];

  if (userLevel < requiredLevel) {
    throw new ConvexError(
      `Insufficient permissions. Required: ${minimumRole}, current: ${profile.role}`
    );
  }

  return { authUser, profile };
}

// --- Organisation mutations ---

export const createOrganisation = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
  },
  async handler(ctx, args) {
    const authUser = await getAuthUser(ctx);
    if (!authUser) {
      throw new ConvexError("Not authenticated");
    }

    // Check if user already has a profile (already in an org)
    const existingProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", authUser._id))
      .unique();

    if (existingProfile) {
      throw new ConvexError("You already belong to an organisation.");
    }

    // Check slug uniqueness
    const existingSlug = await ctx.db
      .query("organisations")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (existingSlug) {
      throw new ConvexError("An organisation with this slug already exists.");
    }

    // Generate a random invite code
    const inviteCode = generateInviteCode();

    const now = Date.now();

    const orgId = await ctx.db.insert("organisations", {
      name: args.name,
      slug: args.slug,
      inviteCode,
      createdAt: now,
      updatedAt: now,
    });

    // Create the founding user's profile as admin
    await ctx.db.insert("userProfiles", {
      userId: authUser._id,
      organisationId: orgId,
      role: "admin",
      displayName: authUser.name ?? authUser.email ?? "Admin",
      createdAt: now,
      updatedAt: now,
    });

    return { orgId, inviteCode };
  },
});

export const joinOrganisation = mutation({
  args: {
    inviteCode: v.string(),
  },
  async handler(ctx, args) {
    const authUser = await getAuthUser(ctx);
    if (!authUser) {
      throw new ConvexError("Not authenticated");
    }

    // Check if user already has a profile
    const existingProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", authUser._id))
      .unique();

    if (existingProfile) {
      throw new ConvexError("You already belong to an organisation.");
    }

    // Find org by invite code
    const org = await ctx.db
      .query("organisations")
      .withIndex("by_inviteCode", (q) => q.eq("inviteCode", args.inviteCode))
      .unique();

    if (!org) {
      throw new ConvexError("Invalid invite code.");
    }

    const now = Date.now();

    await ctx.db.insert("userProfiles", {
      userId: authUser._id,
      organisationId: org._id,
      role: "scout",
      displayName: authUser.name ?? authUser.email ?? "Scout",
      createdAt: now,
      updatedAt: now,
    });

    return { orgId: org._id, orgName: org.name };
  },
});

// --- Role management ---

export const updateUserRole = mutation({
  args: {
    targetUserId: v.string(),
    newRole: roleValidator,
  },
  async handler(ctx, args) {
    const { profile: adminProfile } = await requireRole(ctx, "admin");

    // Find the target user's profile in the same org
    const targetProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.targetUserId))
      .unique();

    if (!targetProfile) {
      throw new ConvexError("Target user profile not found.");
    }

    if (
      targetProfile.organisationId.toString() !==
      adminProfile.organisationId.toString()
    ) {
      throw new ConvexError("Target user is not in your organisation.");
    }

    await ctx.db.patch(targetProfile._id, {
      role: args.newRole,
      updatedAt: Date.now(),
    });
  },
});

// --- Utilities ---

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
