import { v } from "convex/values";
import { api } from "./_generated/api";
import { action, mutation, query } from "./_generated/server";

const FIRST_API_BASE = "https://frc-api.firstinspires.org/v3.0";

function getAuthHeader(): string | null {
  const user = process.env.FIRST_API_USERNAME;
  const key = process.env.FIRST_API_KEY;
  if (!(user && key)) {
    return null;
  }
  return `Basic ${Buffer.from(`${user}:${key}`).toString("base64")}`;
}

/**
 * Resolves the team number for a given position in a match from the cached schedule.
 *
 * @param ctx - The Convex query context
 * @param args.eventCode - Event code
 * @param args.matchNumber - Match number
 * @param args.allianceColour - "Red" or "Blue"
 * @param args.position - 1, 2, or 3
 * @returns Team number or null if not found
 */
export const getTeamForPosition = query({
  args: {
    eventCode: v.string(),
    matchNumber: v.number(),
    allianceColour: v.union(v.literal("Red"), v.literal("Blue")),
    position: v.union(v.literal(1), v.literal(2), v.literal(3)),
  },
  returns: v.union(v.number(), v.null()),
  async handler(ctx, args) {
    const schedule = await ctx.db
      .query("firstApiSchedule")
      .withIndex("by_event_match", (q) =>
        q
          .eq("eventCode", args.eventCode.trim())
          .eq("matchNumber", args.matchNumber)
      )
      .unique();

    if (!schedule) {
      return null;
    }

    const key =
      args.allianceColour === "Red"
        ? (`red${args.position}` as "red1" | "red2" | "red3")
        : (`blue${args.position}` as "blue1" | "blue2" | "blue3");
    const team = schedule[key];
    return team ?? null;
  },
});

const scheduleMatchValidator = v.object({
  matchNumber: v.number(),
  matchType: v.optional(v.string()),
  red1: v.optional(v.number()),
  red2: v.optional(v.number()),
  red3: v.optional(v.number()),
  blue1: v.optional(v.number()),
  blue2: v.optional(v.number()),
  blue3: v.optional(v.number()),
});

/**
 * Saves schedule data from the fetch action. Called by fetchAndCacheEventSchedule.
 */
export const saveScheduleBatch = mutation({
  args: {
    eventCode: v.string(),
    matches: v.array(scheduleMatchValidator),
    cachedAt: v.number(),
  },
  returns: v.null(),
  async handler(ctx, args) {
    const existing = await ctx.db
      .query("firstApiSchedule")
      .withIndex("by_eventCode", (q) => q.eq("eventCode", args.eventCode))
      .collect();

    const existingByMatch = new Map(existing.map((e) => [e.matchNumber, e]));

    for (const match of args.matches) {
      const doc = {
        eventCode: args.eventCode,
        matchNumber: match.matchNumber,
        matchType: match.matchType ?? "qual",
        red1: match.red1,
        red2: match.red2,
        red3: match.red3,
        blue1: match.blue1,
        blue2: match.blue2,
        blue3: match.blue3,
        cachedAt: args.cachedAt,
      };

      const existingMatch = existingByMatch.get(match.matchNumber);
      if (existingMatch) {
        await ctx.db.patch(existingMatch._id, doc);
      } else {
        await ctx.db.insert("firstApiSchedule", doc);
      }
    }
    return null;
  },
});

/**
 * Fetches and caches the event schedule from the FRC FIRST API.
 *
 * @param ctx - The Convex action context
 * @param args.season - Season year (e.g. 2025)
 * @param args.eventCode - Event code (e.g. "AUSC")
 */
export const fetchAndCacheEventSchedule = action({
  args: {
    season: v.number(),
    eventCode: v.string(),
  },
  returns: v.null(),
  async handler(ctx, args) {
    const auth = getAuthHeader();
    if (!auth) {
      throw new Error(
        "FIRST_API_USERNAME and FIRST_API_KEY must be set to fetch schedule"
      );
    }

    const url = `${FIRST_API_BASE}/${args.season}/schedule/${args.eventCode}?tournamentLevel=qual`;
    const res = await fetch(url, {
      headers: { Authorization: auth },
    });

    if (!res.ok) {
      throw new Error(`FIRST API error: ${res.status} ${res.statusText}`);
    }

    const data = (await res.json()) as {
      Schedule?: Array<{
        matchNumber: number;
        matchType?: string;
        alliances?: Array<{
          alliance: "red" | "blue";
          teamKeys: string[];
        }>;
      }>;
    };

    const schedule = data.Schedule ?? [];
    const parseTeam = (key: string) => {
      const m = key.match(/frc(\d+)/);
      return m ? Number.parseInt(m[1], 10) : undefined;
    };

    const matches = schedule.map((match) => {
      const teamKeys = match.alliances ?? [];
      const redTeams =
        teamKeys.find((a) => a.alliance === "red")?.teamKeys ?? [];
      const blueTeams =
        teamKeys.find((a) => a.alliance === "blue")?.teamKeys ?? [];
      return {
        matchNumber: match.matchNumber,
        matchType: match.matchType,
        red1: parseTeam(redTeams[0]),
        red2: parseTeam(redTeams[1]),
        red3: parseTeam(redTeams[2]),
        blue1: parseTeam(blueTeams[0]),
        blue2: parseTeam(blueTeams[1]),
        blue3: parseTeam(blueTeams[2]),
      };
    });

    await ctx.runMutation(api.firstApi.saveScheduleBatch, {
      eventCode: args.eventCode.trim(),
      matches,
      cachedAt: Date.now(),
    });

    return null;
  },
});
