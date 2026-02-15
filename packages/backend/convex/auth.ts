/** biome-ignore-all lint/suspicious/noExplicitAny: PASS */
import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth/minimal";
import { ConvexError, v } from "convex/values";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import authConfig from "./auth.config";
import { roleValidator } from "./schema";

// biome-ignore lint/style/noNonNullAssertion: PASS
const siteUrl = process.env.SITE_URL!;

export const authComponent = createClient<DataModel>(components.betterAuth);

/**
 * @param ctx - The Convex generic context (mutation/action)
 * @returns Configured Better Auth instance
 */
export const createAuth = (ctx: GenericCtx<DataModel>) =>
  betterAuth({
    baseURL: siteUrl,
    trustedOrigins: [siteUrl],
    database: authComponent.adapter(ctx as any),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    plugins: [convex({ authConfig })],
  });

// --- Queries ---

/**
 * Returns the currently authenticated user from Better Auth or null if not signed in.
 *
 * @param ctx - The Convex query context
 * @param _args - No arguments
 * @returns The auth user or null
 */
export const getCurrentUser = query({
  args: {},
  returns: v.any(),
  async handler(ctx, _args) {
    return await authComponent.getAuthUser(ctx as any);
  },
});

/**
 * Returns the current user's profile (organisation, role, display name) or null if not signed in or no profile.
 *
 * @param ctx - The Convex query context
 * @param _args - No arguments
 * @returns The user profile or null
 */
export const getCurrentUserProfile = query({
  args: {},
  returns: v.any(),
  async handler(ctx, _args) {
    const profile = await resolveUserProfile(ctx);
    return profile;
  },
});

// --- Helpers ---

/**
 * Fetches the authenticated user for the current request from Better Auth.
 *
 * @param ctx - The Convex query context
 * @returns The auth user or null
 */
export async function getAuthUser(ctx: QueryCtx) {
  return await authComponent.getAuthUser(ctx as any);
}

/**
 * Loads the user profile for the current auth user (organisation, role, display name).
 *
 * @param ctx - The Convex query context
 * @returns The user profile or null if not authenticated or no profile exists
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
 * Ensures the current user is authenticated and has a user profile; throws otherwise.
 *
 * @param ctx - The Convex query context
 * @returns The auth user and their profile
 * @throws ConvexError if not authenticated or no profile (e.g. not in an organisation)
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
 * Ensures the current user has at least the given role level (admin > leadScout > scout).
 *
 * @param ctx - The Convex query context
 * @param minimumRole - Minimum role required: "admin", "leadScout", or "scout"
 * @returns The auth user and their profile
 * @throws ConvexError if not authenticated, no profile or insufficient role
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

// --- Org Mutations ---

/**
 * Creates a new organisation and assigns the current user as admin. User must not already belong to an organisation.
 *
 * @param ctx - The Convex mutation context
 * @param args.name - Organisation display name
 * @param args.slug - Unique URL-friendly identifier
 * @returns The new organisation ID and generated invite code
 * @throws ConvexError if not authenticated, already in an org or slug is taken
 */
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

    const existingProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", authUser._id))
      .unique();

    if (existingProfile) {
      throw new ConvexError("You already belong to an organisation.");
    }

    const existingSlug = await ctx.db
      .query("organisations")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (existingSlug) {
      throw new ConvexError("An organisation with this slug already exists.");
    }

    const inviteCode = generateInviteCode();

    const now = Date.now();

    const orgId = await ctx.db.insert("organisations", {
      name: args.name,
      slug: args.slug,
      inviteCode,
      createdAt: now,
      updatedAt: now,
    });

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

/**
 * Joins the current user to an organisation using an invite code. User must not already belong to an organisation.
 *
 * @param ctx - The Convex mutation context
 * @param args.inviteCode - Invite code from the organisation
 * @returns The organisation ID and name
 * @throws ConvexError if not authenticated, already in an org or invalid invite code
 */
export const joinOrganisation = mutation({
  args: {
    inviteCode: v.string(),
  },
  async handler(ctx, args) {
    const authUser = await getAuthUser(ctx);
    if (!authUser) {
      throw new ConvexError("Not authenticated");
    }

    const existingProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", authUser._id))
      .unique();

    if (existingProfile) {
      throw new ConvexError("You already belong to an organisation.");
    }

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

// --- Role Management ---

/**
 * Updates a user's role within the caller's organisation. Caller must be an admin; target must be in the same organisation.
 *
 * @param ctx - The Convex mutation context
 * @param args.targetUserId - ID of the user whose role to change
 * @param args.newRole - New role: "admin", "leadScout", or "scout"
 * @throws ConvexError if caller is not admin, target not found or target not in same organisation
 */
export const updateUserRole = mutation({
  args: {
    targetUserId: v.string(),
    newRole: roleValidator,
  },
  async handler(ctx, args) {
    const { profile: adminProfile } = await requireRole(ctx, "admin");

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

/**
 * Generates an 8-character invite code (uppercase letters and digits, excluding ambiguous characters).
 *
 * @returns A random invite code string
 */
function generateInviteCode(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
