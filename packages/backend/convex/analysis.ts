import {
  accumulateFrcSubmission,
  accumulateFtcSubmission,
  binHeatmap,
  buildAggregateFromAccumulator,
  type CompetitionType,
  collectHeatSamplesForSubmission,
  computeFrcPerPeriodAverages,
  computeFtcPerPeriodAverages,
  countSpatialEligibleMatches,
  emptyAccumulator,
  filterHeatSamplesByPhase,
} from "@decode/analytics";
import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireUserProfile } from "./auth";
import { competitionTypeValidator } from "./schema";

/**
 * Returns events (FRC and/or FTC) that have match or pit submissions for the current org.
 * Each entry includes the event code, event name (if available), and submission counts.
 *
 * @param ctx - The Convex query context
 * @returns Array of event summaries ordered by most recent submission
 */
export const getEventsWithSubmissions = query({
  args: {},
  returns: v.any(),
  async handler(ctx) {
    const { profile } = await requireUserProfile(ctx);

    const matchSubs = await ctx.db
      .query("matchSubmissions")
      .withIndex("by_organisationId", (q) =>
        q.eq("organisationId", profile.organisationId)
      )
      .collect();

    const pitSubs = await ctx.db
      .query("pitSubmissions")
      .withIndex("by_organisationId", (q) =>
        q.eq("organisationId", profile.organisationId)
      )
      .collect();

    type EventEntry = {
      eventCode: string;
      eventName?: string;
      competitionType: "FRC" | "FTC";
      matchCount: number;
      pitCount: number;
      latestAt: number;
    };

    const eventMap = new Map<string, EventEntry>();

    function eventKey(eventCode: string, competitionType: "FRC" | "FTC") {
      return `${eventCode}::${competitionType}`;
    }

    for (const sub of matchSubs) {
      const ct = sub.competitionType;
      if (ct !== "FRC" && ct !== "FTC") {
        continue;
      }
      const key = eventKey(sub.eventCode, ct);
      const existing = eventMap.get(key) ?? {
        eventCode: sub.eventCode,
        eventName: sub.eventName,
        competitionType: ct,
        matchCount: 0,
        pitCount: 0,
        latestAt: 0,
      };
      eventMap.set(key, {
        ...existing,
        matchCount: existing.matchCount + 1,
        latestAt: Math.max(existing.latestAt, sub.createdAt),
        eventName: sub.eventName ?? existing.eventName,
      });
    }

    for (const sub of pitSubs) {
      const ct = sub.competitionType;
      if (ct !== "FRC" && ct !== "FTC") {
        continue;
      }
      const key = eventKey(sub.eventCode, ct);
      const existing = eventMap.get(key) ?? {
        eventCode: sub.eventCode,
        eventName: sub.eventName,
        competitionType: ct,
        matchCount: 0,
        pitCount: 0,
        latestAt: 0,
      };
      eventMap.set(key, {
        ...existing,
        pitCount: existing.pitCount + 1,
        latestAt: Math.max(existing.latestAt, sub.createdAt),
        eventName: sub.eventName ?? existing.eventName,
      });
    }

    return Array.from(eventMap.values()).sort(
      (a, b) => b.latestAt - a.latestAt
    );
  },
});

/**
 * Returns the distinct teams that have match submissions for a given event and programme in the current org.
 *
 * @param ctx - The Convex query context
 * @param args.eventCode - The event code to look up
 * @param args.competitionType - Optional `FRC` (default) or `FTC`
 * @returns Array of team summaries with match submission counts
 */
export const getEventTeams = query({
  args: {
    eventCode: v.string(),
    competitionType: v.optional(competitionTypeValidator),
  },
  returns: v.any(),
  async handler(ctx, args) {
    const { profile } = await requireUserProfile(ctx);
    const competitionType = args.competitionType ?? "FRC";

    const matchSubs = await ctx.db
      .query("matchSubmissions")
      .withIndex("by_org_and_event", (q) =>
        q
          .eq("organisationId", profile.organisationId)
          .eq("eventCode", args.eventCode)
      )
      .collect();

    const typedMatchSubs = matchSubs.filter(
      (s) => s.competitionType === competitionType
    );

    const teamMap = new Map<number, { matchCount: number }>();
    for (const sub of typedMatchSubs) {
      const existing = teamMap.get(sub.teamNumber) ?? { matchCount: 0 };
      teamMap.set(sub.teamNumber, {
        matchCount: existing.matchCount + 1,
      });
    }

    return Array.from(teamMap.entries())
      .map(([teamNumber, data]) => ({ teamNumber, ...data }))
      .sort((a, b) => a.teamNumber - b.teamNumber);
  },
});

/**
 * Returns all match submissions for a specific team at a given event (FRC or FTC).
 *
 * @param ctx - The Convex query context
 * @param args.eventCode - The event code
 * @param args.teamNumber - The team number
 * @param args.competitionType - Optional `FRC` (default) or `FTC`
 * @returns Array of match submissions ordered by match number
 */
export const getTeamMatchStats = query({
  args: {
    eventCode: v.string(),
    teamNumber: v.number(),
    competitionType: v.optional(competitionTypeValidator),
  },
  returns: v.any(),
  async handler(ctx, args) {
    const { profile } = await requireUserProfile(ctx);
    const competitionType = args.competitionType ?? "FRC";

    const submissions = await ctx.db
      .query("matchSubmissions")
      .withIndex("by_org_event_team", (q) =>
        q
          .eq("organisationId", profile.organisationId)
          .eq("eventCode", args.eventCode)
          .eq("teamNumber", args.teamNumber)
      )
      .collect();

    return submissions
      .filter((s) => s.competitionType === competitionType)
      .sort((a, b) => a.matchNumber - b.matchNumber);
  },
});

/**
 * Returns the most recent pit submission for a specific team at a given event (FRC or FTC).
 *
 * @param ctx - The Convex query context
 * @param args.eventCode - The event code
 * @param args.teamNumber - The team number
 * @returns The latest pit submission or null
 */
export const getTeamPitData = query({
  args: {
    eventCode: v.string(),
    teamNumber: v.number(),
    competitionType: v.optional(competitionTypeValidator),
  },
  returns: v.any(),
  async handler(ctx, args) {
    const { profile } = await requireUserProfile(ctx);
    const competitionType = args.competitionType ?? "FRC";

    const submissions = await ctx.db
      .query("pitSubmissions")
      .withIndex("by_org_event_team", (q) =>
        q
          .eq("organisationId", profile.organisationId)
          .eq("eventCode", args.eventCode)
          .eq("teamNumber", args.teamNumber)
      )
      .collect();

    const filtered = submissions.filter(
      (s) => s.competitionType === competitionType
    );
    if (filtered.length === 0) {
      return null;
    }

    return filtered.sort((a, b) => b.createdAt - a.createdAt)[0];
  },
});

function avgNumeric(
  subs: { weight?: number }[],
  key: "weight"
): number | undefined;
function avgNumeric(
  subs: { hopperCapacity?: number }[],
  key: "hopperCapacity"
): number | undefined;
function avgNumeric(
  subs: { shootingSpeed?: number }[],
  key: "shootingSpeed"
): number | undefined;
function avgNumeric(subs: unknown[], key: string): number | undefined {
  const vals = (subs as { [k: string]: number | undefined }[])
    .map((item) => item[key])
    .filter((val): val is number => typeof val === "number");
  if (vals.length === 0) {
    return;
  }
  const sum = vals.reduce((a, b) => a + b, 0);
  return Math.round((sum / vals.length) * 10) / 10;
}

function computeAvgPitClimbLevel(
  subs: { maxClimbLevel?: number }[]
): 0 | 1 | 2 | 3 | undefined {
  const vals = subs
    .filter((item) => item.maxClimbLevel !== undefined)
    .map((item) => item.maxClimbLevel as number);
  if (vals.length === 0) {
    return;
  }
  const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  return Math.max(0, Math.min(3, avg)) as 0 | 1 | 2 | 3;
}

function aggregatePitDimensions(
  subs: {
    robotDimensions?: { length?: number; width?: number; height?: number };
  }[]
) {
  const dimSubs = subs.filter(
    (s) =>
      s.robotDimensions?.length !== undefined &&
      s.robotDimensions?.width !== undefined &&
      s.robotDimensions?.height !== undefined
  );
  if (dimSubs.length === 0) {
    return;
  }
  return {
    length: Math.round(
      dimSubs.reduce((sum, x) => sum + (x.robotDimensions?.length ?? 0), 0) /
        dimSubs.length
    ),
    width: Math.round(
      dimSubs.reduce((sum, x) => sum + (x.robotDimensions?.width ?? 0), 0) /
        dimSubs.length
    ),
    height: Math.round(
      dimSubs.reduce((sum, x) => sum + (x.robotDimensions?.height ?? 0), 0) /
        dimSubs.length
    ),
  };
}

function aggregatePitDrivetrain(
  subs: { drivetrainType?: string }[]
): "swerve" | "tank" | "other" | undefined {
  const votes = new Map<string, number>();
  for (const sub of subs) {
    if (sub.drivetrainType) {
      votes.set(sub.drivetrainType, (votes.get(sub.drivetrainType) ?? 0) + 1);
    }
  }
  let result: "swerve" | "tank" | "other" | undefined;
  let maxVotes = 0;
  for (const [dt, count] of votes) {
    if (count > maxVotes) {
      maxVotes = count;
      result = dt as "swerve" | "tank" | "other";
    }
  }
  return result;
}

function aggregatePitText(
  subs: { autoCapabilities?: string; notes?: string }[],
  key: "autoCapabilities" | "notes"
): string | undefined {
  const parts = subs
    .filter((s) => ((s[key] as string) ?? "").trim())
    .map((s) => ((s[key] as string) ?? "").trim());
  return parts.length > 0 ? [...new Set(parts)].join(" | ") : undefined;
}

/**
 * Returns aggregated pit data from all pit submissions for a team at an event (FRC or FTC).
 * Numeric values are averaged; photos are collected from all submissions with URLs resolved.
 *
 * @param ctx - The Convex query context
 * @param args.eventCode - The event code
 * @param args.teamNumber - The team number
 * @returns Aggregated pit data with photoUrls, or null if no submissions
 */
export const getTeamPitDataAggregated = query({
  args: {
    eventCode: v.string(),
    teamNumber: v.number(),
    competitionType: v.optional(competitionTypeValidator),
  },
  returns: v.any(),
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: pit field aggregation (FRC vs FTC branches)
  async handler(ctx, args) {
    const { profile } = await requireUserProfile(ctx);
    const competitionType = args.competitionType ?? "FRC";

    const submissions = await ctx.db
      .query("pitSubmissions")
      .withIndex("by_org_event_team", (q) =>
        q
          .eq("organisationId", profile.organisationId)
          .eq("eventCode", args.eventCode)
          .eq("teamNumber", args.teamNumber)
      )
      .collect();

    const typedSubs = submissions.filter(
      (s) => s.competitionType === competitionType
    );
    if (typedSubs.length === 0) {
      return null;
    }

    const n = typedSubs.length;
    const weight = avgNumeric(typedSubs, "weight");
    const robotDimensions = aggregatePitDimensions(typedSubs);
    const maxClimbLevel = computeAvgPitClimbLevel(typedSubs);

    const intakeSet = new Set<string>();
    for (const sub of typedSubs) {
      for (const m of sub.intakeMethods ?? []) {
        intakeSet.add(m);
      }
    }
    const intakeMethods =
      intakeSet.size > 0 ? Array.from(intakeSet) : undefined;

    const drivetrainType = aggregatePitDrivetrain(typedSubs);
    const autoCapabilities = aggregatePitText(typedSubs, "autoCapabilities");
    const notes = aggregatePitText(typedSubs, "notes");

    const photoIds = new Set<string>();
    for (const sub of typedSubs) {
      for (const id of sub.photos ?? []) {
        photoIds.add(id);
      }
    }
    const photoUrls: string[] = [];
    for (const id of photoIds) {
      const url = await ctx.storage.getUrl(id as `${string}_${string}`);
      if (url) {
        photoUrls.push(url);
      }
    }

    if (competitionType === "FTC") {
      const canShootDeep = typedSubs.some((s) => s.canShootDeep === true);
      return {
        weight,
        robotDimensions,
        maxClimbLevel,
        intakeMethods,
        canShootDeep: canShootDeep || undefined,
        drivetrainType,
        autoCapabilities,
        notes,
        photoUrls,
        submissionCount: n,
      };
    }

    const hopperAvg = avgNumeric(typedSubs, "hopperCapacity");
    const hopperCapacity =
      hopperAvg !== undefined ? Math.round(hopperAvg) : undefined;
    const shootingSpeed = avgNumeric(typedSubs, "shootingSpeed");

    const canPassTrench = typedSubs.some((s) => s.canPassTrench === true);
    const canCrossBump = typedSubs.some((s) => s.canCrossBump === true);

    return {
      weight,
      hopperCapacity,
      shootingSpeed,
      robotDimensions,
      maxClimbLevel,
      intakeMethods,
      canPassTrench: canPassTrench || undefined,
      canCrossBump: canCrossBump || undefined,
      drivetrainType,
      autoCapabilities,
      notes,
      photoUrls,
      submissionCount: n,
    };
  },
});

/**
 * Returns match and pit submission counts for a given event.
 *
 * @param ctx - The Convex query context
 * @param args.eventCode - The event code
 * @returns Object with matchCount and pitCount
 */
export const getEventSubmissionCounts = query({
  args: {
    eventCode: v.string(),
    competitionType: v.optional(competitionTypeValidator),
  },
  returns: v.any(),
  async handler(ctx, args) {
    const { profile } = await requireUserProfile(ctx);
    const competitionType = args.competitionType ?? "FRC";

    const [matchSubs, pitSubs] = await Promise.all([
      ctx.db
        .query("matchSubmissions")
        .withIndex("by_org_and_event", (q) =>
          q
            .eq("organisationId", profile.organisationId)
            .eq("eventCode", args.eventCode)
        )
        .collect(),
      ctx.db
        .query("pitSubmissions")
        .withIndex("by_org_and_event", (q) =>
          q
            .eq("organisationId", profile.organisationId)
            .eq("eventCode", args.eventCode)
        )
        .collect(),
    ]);

    const matchCount = matchSubs.filter(
      (s) => s.competitionType === competitionType
    ).length;
    const pitCount = pitSubs.filter(
      (s) => s.competitionType === competitionType
    ).length;

    return { matchCount, pitCount };
  },
});

/**
 * Returns aggregated per-team metrics for all teams at a given event (FRC or FTC), ranked by scoring activity.
 * Includes teams with match data and teams with pit-only data. Each aggregate includes pitCount.
 *
 * @param ctx - The Convex query context
 * @param args.eventCode - The event code
 * @param args.allianceFilter - Optional alliance colour filter
 * @param args.stageFilter - Optional match stage filter
 * @returns Ranked array of team aggregates with pitCount
 */
export const getEventAggregates = query({
  args: {
    eventCode: v.string(),
    allianceFilter: v.optional(
      v.union(v.literal("Red"), v.literal("Blue"), v.literal("all"))
    ),
    stageFilter: v.optional(
      v.union(
        v.literal("qual"),
        v.literal("playoff"),
        v.literal("practice"),
        v.literal("all")
      )
    ),
    competitionType: v.optional(competitionTypeValidator),
  },
  returns: v.any(),
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: team aggregates, filters, and pit-only merge
  async handler(ctx, args) {
    const { profile } = await requireUserProfile(ctx);
    const competitionType = args.competitionType ?? "FRC";

    const [allMatchSubs, pitSubs] = await Promise.all([
      ctx.db
        .query("matchSubmissions")
        .withIndex("by_org_and_event", (q) =>
          q
            .eq("organisationId", profile.organisationId)
            .eq("eventCode", args.eventCode)
        )
        .collect(),
      ctx.db
        .query("pitSubmissions")
        .withIndex("by_org_and_event", (q) =>
          q
            .eq("organisationId", profile.organisationId)
            .eq("eventCode", args.eventCode)
        )
        .collect(),
    ]);

    let subs = allMatchSubs.filter(
      (s) => s.competitionType === competitionType
    );

    if (args.allianceFilter && args.allianceFilter !== "all") {
      subs = subs.filter((s) => s.allianceColour === args.allianceFilter);
    }
    if (args.stageFilter && args.stageFilter !== "all") {
      subs = subs.filter((s) => s.matchStage === args.stageFilter);
    }

    const teamMap = new Map<number, typeof subs>();
    for (const sub of subs) {
      if (!teamMap.has(sub.teamNumber)) {
        teamMap.set(sub.teamNumber, []);
      }
      teamMap.get(sub.teamNumber)?.push(sub);
    }

    const pitCountMap = new Map<number, number>();
    for (const sub of pitSubs.filter(
      (s) => s.competitionType === competitionType
    )) {
      pitCountMap.set(
        sub.teamNumber,
        (pitCountMap.get(sub.teamNumber) ?? 0) + 1
      );
    }

    const aggregates: (ReturnType<typeof buildAggregateFromAccumulator> & {
      pitCount: number;
      fieldSpatialMatchCount: number;
    })[] = [];

    for (const [teamNumber, teamSubs] of teamMap) {
      const acc = emptyAccumulator();
      for (const sub of teamSubs) {
        if (competitionType === "FTC") {
          accumulateFtcSubmission(acc, sub);
        } else {
          accumulateFrcSubmission(acc, sub);
        }
      }
      const spatialSlices = teamSubs.map((sub) => ({
        ...sub,
        competitionType: competitionType as CompetitionType,
      }));
      aggregates.push({
        ...buildAggregateFromAccumulator(teamNumber, acc, teamSubs.length),
        pitCount: pitCountMap.get(teamNumber) ?? 0,
        fieldSpatialMatchCount: countSpatialEligibleMatches(
          spatialSlices,
          competitionType as CompetitionType
        ),
      });
    }

    const matchTeamNumbers = new Set(teamMap.keys());
    const pitOnlyTeams = [...pitCountMap.keys()].filter(
      (tn) => !matchTeamNumbers.has(tn)
    );

    for (const teamNumber of pitOnlyTeams.sort((a, b) => a - b)) {
      aggregates.push({
        teamNumber,
        matchCount: 0,
        climbSuccessRate: 0,
        avgClimbLevel: 0,
        avgClimbDuration: 0,
        avgScoringActivity: 0,
        avgDefenseActivity: 0,
        primaryInputMode: "form" as const,
        formMatchCount: 0,
        fieldMatchCount: 0,
        pitCount: pitCountMap.get(teamNumber) ?? 0,
        fieldSpatialMatchCount: 0,
      });
    }

    aggregates.sort((a, b) => {
      if (a.matchCount > 0 && b.matchCount > 0) {
        return b.avgScoringActivity - a.avgScoringActivity;
      }
      if (a.matchCount > 0) {
        return -1;
      }
      if (b.matchCount > 0) {
        return 1;
      }
      return a.teamNumber - b.teamNumber;
    });

    return aggregates.map((item, index) => ({ ...item, rank: index + 1 }));
  },
});

/**
 * Returns all match submissions for a specific match number at a given event (FRC or FTC).
 *
 * @param ctx - The Convex query context
 * @param args.eventCode - The event code
 * @param args.matchNumber - The match number
 * @returns Array of match submissions for that match
 */
export const getMatchSubmissionsForMatch = query({
  args: {
    eventCode: v.string(),
    matchNumber: v.number(),
    competitionType: v.optional(competitionTypeValidator),
  },
  returns: v.any(),
  async handler(ctx, args) {
    const { profile } = await requireUserProfile(ctx);
    const competitionType = args.competitionType ?? "FRC";

    const submissions = await ctx.db
      .query("matchSubmissions")
      .withIndex("by_event_match", (q) =>
        q.eq("eventCode", args.eventCode).eq("matchNumber", args.matchNumber)
      )
      .collect();

    return submissions.filter(
      (s) =>
        s.competitionType === competitionType &&
        s.organisationId === profile.organisationId
    );
  },
});

const heatmapPeriodFilterValidator = v.union(
  v.literal("all"),
  v.literal("AUTO"),
  v.literal("TRANSITION"),
  v.literal("SHIFT_1"),
  v.literal("SHIFT_2"),
  v.literal("SHIFT_3"),
  v.literal("SHIFT_4"),
  v.literal("END_GAME"),
  v.literal("TELEOP")
);

/**
 * Binned field scoring heat map for a team (field submissions with coordinates).
 *
 * @param ctx - The Convex query context
 * @param args.periodFilter - FRC game period, `TELEOP` for FTC teleop makes, or `all`
 */
export const getTeamFieldHeatmap = query({
  args: {
    eventCode: v.string(),
    teamNumber: v.number(),
    competitionType: v.optional(competitionTypeValidator),
    periodFilter: v.optional(heatmapPeriodFilterValidator),
  },
  returns: v.any(),
  async handler(ctx, args) {
    const { profile } = await requireUserProfile(ctx);
    const competitionType = args.competitionType ?? "FRC";
    const comp = competitionType as CompetitionType;

    const submissions = await ctx.db
      .query("matchSubmissions")
      .withIndex("by_org_event_team", (q) =>
        q
          .eq("organisationId", profile.organisationId)
          .eq("eventCode", args.eventCode)
          .eq("teamNumber", args.teamNumber)
      )
      .collect();

    const typed = submissions
      .filter((s) => s.competitionType === competitionType)
      .sort((a, b) => a.matchNumber - b.matchNumber);

    const periodFilter = args.periodFilter ?? "all";
    const slices = typed.map((sub) => ({
      ...sub,
      competitionType: comp,
    }));

    const allSamples = slices.flatMap((sub) =>
      collectHeatSamplesForSubmission(sub, comp)
    );
    const hasFieldSpatialData = allSamples.length > 0;
    const fieldSpatialMatchCount = countSpatialEligibleMatches(slices, comp);

    const filteredSamples = filterHeatSamplesByPhase(
      allSamples,
      comp,
      periodFilter
    );
    const binned = binHeatmap(filteredSamples);

    return {
      competitionType,
      periodFilter,
      hasFieldSpatialData,
      fieldSpatialMatchCount,
      ...binned,
    };
  },
});

/**
 * Returns batched match and pit data for multiple teams at a given event, used for side-by-side comparison.
 *
 * @param ctx - The Convex query context
 * @param args.eventCode - The event code
 * @param args.teamNumbers - Array of team numbers to compare (max 6)
 * @returns Array of per-team data including match submissions, pit data, and computed metrics
 */
export const getComparisonData = query({
  args: {
    eventCode: v.string(),
    teamNumbers: v.array(v.number()),
    competitionType: v.optional(competitionTypeValidator),
  },
  returns: v.any(),
  async handler(ctx, args) {
    const { profile } = await requireUserProfile(ctx);
    const competitionType = args.competitionType ?? "FRC";

    const results: unknown[] = [];

    for (const teamNumber of args.teamNumbers.slice(0, 6)) {
      const matchSubs = await ctx.db
        .query("matchSubmissions")
        .withIndex("by_org_event_team", (q) =>
          q
            .eq("organisationId", profile.organisationId)
            .eq("eventCode", args.eventCode)
            .eq("teamNumber", teamNumber)
        )
        .collect();

      const typedMatchSubs = matchSubs
        .filter((s) => s.competitionType === competitionType)
        .sort((a, b) => a.matchNumber - b.matchNumber);

      const pitSubs = await ctx.db
        .query("pitSubmissions")
        .withIndex("by_org_event_team", (q) =>
          q
            .eq("organisationId", profile.organisationId)
            .eq("eventCode", args.eventCode)
            .eq("teamNumber", teamNumber)
        )
        .collect();

      const typedPitSubs = pitSubs.filter(
        (s) => s.competitionType === competitionType
      );
      const latestPit =
        typedPitSubs.sort((a, b) => b.createdAt - a.createdAt)[0] ?? null;

      const acc = emptyAccumulator();
      for (const sub of typedMatchSubs) {
        if (competitionType === "FTC") {
          accumulateFtcSubmission(acc, sub);
        } else {
          accumulateFrcSubmission(acc, sub);
        }
      }

      const base = buildAggregateFromAccumulator(
        teamNumber,
        acc,
        typedMatchSubs.length
      );
      const avgPerPeriodScoring =
        competitionType === "FTC"
          ? computeFtcPerPeriodAverages(typedMatchSubs)
          : computeFrcPerPeriodAverages(typedMatchSubs);

      const spatialSlices = typedMatchSubs.map((sub) => ({
        ...sub,
        competitionType: competitionType as CompetitionType,
      }));

      results.push({
        ...base,
        fieldSpatialMatchCount: countSpatialEligibleMatches(
          spatialSlices,
          competitionType as CompetitionType
        ),
        pitSubmission: latestPit,
        avgPerPeriodScoring,
        matchSubmissions: typedMatchSubs,
      });
    }

    return results;
  },
});
