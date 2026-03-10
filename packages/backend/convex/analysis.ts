import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireUserProfile } from "./auth";

type PeriodData = {
  auto: { scoring: number; feeding: number; defense: number };
  transition: { scoring: number; feeding: number; defense: number };
  shift1: { scoring: number; feeding: number; defense: number };
  shift2: { scoring: number; feeding: number; defense: number };
  shift3: { scoring: number; feeding: number; defense: number };
  shift4: { scoring: number; feeding: number; defense: number };
  endGame: { scoring: number; feeding: number; defense: number };
};

type FrcFieldEvent = {
  coordinates: { x: number; y: number };
  startTimestamp: string;
  endTimestamp: string;
  duration: number;
  period: string;
  eventType: string;
  action?: string;
  source?: string;
  climbLevel?: number;
};

type TeamAccumulator = {
  totalScoring: number;
  totalDefense: number;
  climbSuccess: number;
  totalClimbLevel: number;
  totalClimbDuration: number;
  climbDurationCount: number;
  formCount: number;
  fieldCount: number;
};

type PerPeriodMap = Record<string, number>;

const PERIODS = [
  "AUTO",
  "TRANSITION",
  "SHIFT_1",
  "SHIFT_2",
  "SHIFT_3",
  "SHIFT_4",
  "END_GAME",
] as const;

// --- Helpers ---

function sumScoringSeconds(periodData: PeriodData): number {
  return (
    periodData.auto.scoring +
    periodData.transition.scoring +
    periodData.shift1.scoring +
    periodData.shift2.scoring +
    periodData.shift3.scoring +
    periodData.shift4.scoring +
    periodData.endGame.scoring
  );
}

function sumDefenseSeconds(periodData: PeriodData): number {
  return (
    periodData.auto.defense +
    periodData.transition.defense +
    periodData.shift1.defense +
    periodData.shift2.defense +
    periodData.shift3.defense +
    periodData.shift4.defense +
    periodData.endGame.defense
  );
}

function countScoringEvents(events: FrcFieldEvent[]): number {
  return events.filter(
    (e) => e.eventType === "shooting" && e.action === "scoring"
  ).length;
}

function sumDefenseEventSeconds(events: FrcFieldEvent[]): number {
  return events
    .filter((e) => e.eventType === "defense")
    .reduce((sum, e) => sum + e.duration / 1000, 0);
}

function perPeriodScoringFromPeriodData(periodData: PeriodData): PerPeriodMap {
  return {
    AUTO: periodData.auto.scoring,
    TRANSITION: periodData.transition.scoring,
    SHIFT_1: periodData.shift1.scoring,
    SHIFT_2: periodData.shift2.scoring,
    SHIFT_3: periodData.shift3.scoring,
    SHIFT_4: periodData.shift4.scoring,
    END_GAME: periodData.endGame.scoring,
  };
}

function perPeriodScoringFromFieldEvents(
  events: FrcFieldEvent[]
): PerPeriodMap {
  const result: PerPeriodMap = {};
  for (const period of PERIODS) {
    result[period] = events.filter(
      (e) =>
        e.period === period &&
        e.eventType === "shooting" &&
        e.action === "scoring"
    ).length;
  }
  return result;
}

function emptyAccumulator(): TeamAccumulator {
  return {
    totalScoring: 0,
    totalDefense: 0,
    climbSuccess: 0,
    totalClimbLevel: 0,
    totalClimbDuration: 0,
    climbDurationCount: 0,
    formCount: 0,
    fieldCount: 0,
  };
}

function accumulateSubmission(
  acc: TeamAccumulator,
  sub: {
    climbLevel?: number;
    climbDuration?: number;
    inputMode: string;
    periodData?: unknown;
    frcFieldEvents?: unknown;
  }
): void {
  if ((sub.climbLevel ?? 0) > 0) {
    acc.climbSuccess += 1;
  }
  acc.totalClimbLevel += sub.climbLevel ?? 0;
  if (sub.climbDuration && sub.climbDuration > 0) {
    acc.totalClimbDuration += sub.climbDuration;
    acc.climbDurationCount += 1;
  }

  if (sub.inputMode === "form" && sub.periodData) {
    acc.formCount += 1;
    const pd = sub.periodData as PeriodData;
    acc.totalScoring += sumScoringSeconds(pd);
    acc.totalDefense += sumDefenseSeconds(pd);
  } else if (
    sub.inputMode === "field" &&
    sub.frcFieldEvents &&
    Array.isArray(sub.frcFieldEvents)
  ) {
    acc.fieldCount += 1;
    const events = sub.frcFieldEvents as FrcFieldEvent[];
    acc.totalScoring += countScoringEvents(events);
    acc.totalDefense += sumDefenseEventSeconds(events);
  }
}

function buildAggregateFromAccumulator(
  teamNumber: number,
  acc: TeamAccumulator,
  matchCount: number
) {
  const climbSuccessRate =
    matchCount > 0 ? Math.round((acc.climbSuccess / matchCount) * 100) : 0;
  const avgClimbLevel =
    matchCount > 0
      ? Math.round((acc.totalClimbLevel / matchCount) * 10) / 10
      : 0;
  const avgClimbDuration =
    acc.climbDurationCount > 0
      ? Math.round(acc.totalClimbDuration / acc.climbDurationCount)
      : 0;
  const avgScoringActivity =
    matchCount > 0 ? Math.round((acc.totalScoring / matchCount) * 10) / 10 : 0;
  const avgDefenseActivity =
    matchCount > 0 ? Math.round((acc.totalDefense / matchCount) * 10) / 10 : 0;
  const primaryInputMode =
    acc.formCount >= acc.fieldCount ? ("form" as const) : ("field" as const);

  return {
    teamNumber,
    matchCount,
    climbSuccessRate,
    avgClimbLevel,
    avgClimbDuration,
    avgScoringActivity,
    avgDefenseActivity,
    primaryInputMode,
    formMatchCount: acc.formCount,
    fieldMatchCount: acc.fieldCount,
  };
}

/**
 * Returns all FRC events that have match or pit submissions for the current org.
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

    const frcMatchSubs = matchSubs.filter((s) => s.competitionType === "FRC");
    const frcPitSubs = pitSubs.filter((s) => s.competitionType === "FRC");

    type EventEntry = {
      eventCode: string;
      eventName?: string;
      matchCount: number;
      pitCount: number;
      latestAt: number;
    };

    const eventMap = new Map<string, EventEntry>();

    for (const sub of frcMatchSubs) {
      const existing = eventMap.get(sub.eventCode) ?? {
        eventCode: sub.eventCode,
        eventName: sub.eventName,
        matchCount: 0,
        pitCount: 0,
        latestAt: 0,
      };
      eventMap.set(sub.eventCode, {
        ...existing,
        matchCount: existing.matchCount + 1,
        latestAt: Math.max(existing.latestAt, sub.createdAt),
      });
    }

    for (const sub of frcPitSubs) {
      const existing = eventMap.get(sub.eventCode) ?? {
        eventCode: sub.eventCode,
        eventName: sub.eventName,
        matchCount: 0,
        pitCount: 0,
        latestAt: 0,
      };
      eventMap.set(sub.eventCode, {
        ...existing,
        pitCount: existing.pitCount + 1,
        latestAt: Math.max(existing.latestAt, sub.createdAt),
      });
    }

    return Array.from(eventMap.values()).sort(
      (a, b) => b.latestAt - a.latestAt
    );
  },
});

/**
 * Returns the distinct teams that have FRC match submissions for a given event in the current org.
 *
 * @param ctx - The Convex query context
 * @param args.eventCode - The event code to look up
 * @returns Array of team summaries with match submission counts
 */
export const getEventTeams = query({
  args: {
    eventCode: v.string(),
  },
  returns: v.any(),
  async handler(ctx, args) {
    const { profile } = await requireUserProfile(ctx);

    const matchSubs = await ctx.db
      .query("matchSubmissions")
      .withIndex("by_org_and_event", (q) =>
        q
          .eq("organisationId", profile.organisationId)
          .eq("eventCode", args.eventCode)
      )
      .collect();

    const frcMatchSubs = matchSubs.filter((s) => s.competitionType === "FRC");

    const teamMap = new Map<number, { matchCount: number }>();
    for (const sub of frcMatchSubs) {
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
 * Returns all FRC match submissions for a specific team at a given event.
 *
 * @param ctx - The Convex query context
 * @param args.eventCode - The event code
 * @param args.teamNumber - The team number
 * @returns Array of match submissions ordered by match number
 */
export const getTeamMatchStats = query({
  args: {
    eventCode: v.string(),
    teamNumber: v.number(),
  },
  returns: v.any(),
  async handler(ctx, args) {
    const { profile } = await requireUserProfile(ctx);

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
      .filter((s) => s.competitionType === "FRC")
      .sort((a, b) => a.matchNumber - b.matchNumber);
  },
});

/**
 * Returns the most recent FRC pit submission for a specific team at a given event.
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
  },
  returns: v.any(),
  async handler(ctx, args) {
    const { profile } = await requireUserProfile(ctx);

    const submissions = await ctx.db
      .query("pitSubmissions")
      .withIndex("by_org_event_team", (q) =>
        q
          .eq("organisationId", profile.organisationId)
          .eq("eventCode", args.eventCode)
          .eq("teamNumber", args.teamNumber)
      )
      .collect();

    const frcSubs = submissions.filter((s) => s.competitionType === "FRC");
    if (frcSubs.length === 0) {
      return null;
    }

    return frcSubs.sort((a, b) => b.createdAt - a.createdAt)[0];
  },
});

/**
 * Returns aggregated per-team metrics for all FRC teams at a given event, ranked by scoring activity.
 * Handles both form-mode (periodData) and field-mode (frcFieldEvents) submissions.
 *
 * @param ctx - The Convex query context
 * @param args.eventCode - The event code
 * @param args.allianceFilter - Optional alliance colour filter
 * @param args.stageFilter - Optional match stage filter
 * @returns Ranked array of team aggregates
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
  },
  returns: v.any(),
  async handler(ctx, args) {
    const { profile } = await requireUserProfile(ctx);

    const allSubs = await ctx.db
      .query("matchSubmissions")
      .withIndex("by_org_and_event", (q) =>
        q
          .eq("organisationId", profile.organisationId)
          .eq("eventCode", args.eventCode)
      )
      .collect();

    let subs = allSubs.filter((s) => s.competitionType === "FRC");

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

    const aggregates: ReturnType<typeof buildAggregateFromAccumulator>[] = [];

    for (const [teamNumber, teamSubs] of teamMap) {
      const acc = emptyAccumulator();
      for (const sub of teamSubs) {
        accumulateSubmission(acc, sub);
      }
      aggregates.push(
        buildAggregateFromAccumulator(teamNumber, acc, teamSubs.length)
      );
    }

    aggregates.sort((a, b) => b.avgScoringActivity - a.avgScoringActivity);

    return aggregates.map((item, index) => ({ ...item, rank: index + 1 }));
  },
});

/**
 * Returns all FRC match submissions for a specific match number at a given event.
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
  },
  returns: v.any(),
  async handler(ctx, args) {
    const { profile } = await requireUserProfile(ctx);

    const submissions = await ctx.db
      .query("matchSubmissions")
      .withIndex("by_event_match", (q) =>
        q.eq("eventCode", args.eventCode).eq("matchNumber", args.matchNumber)
      )
      .collect();

    return submissions.filter(
      (s) =>
        s.competitionType === "FRC" &&
        s.organisationId === profile.organisationId
    );
  },
});

function addPerPeriodFromSub(
  totals: PerPeriodMap,
  sub: { inputMode: string; periodData?: unknown; frcFieldEvents?: unknown }
): void {
  if (sub.inputMode === "form" && sub.periodData) {
    const pp = perPeriodScoringFromPeriodData(sub.periodData as PeriodData);
    for (const [key, val] of Object.entries(pp)) {
      totals[key] = (totals[key] ?? 0) + val;
    }
  } else if (sub.inputMode === "field" && sub.frcFieldEvents) {
    const pp = perPeriodScoringFromFieldEvents(
      sub.frcFieldEvents as FrcFieldEvent[]
    );
    for (const [key, val] of Object.entries(pp)) {
      totals[key] = (totals[key] ?? 0) + val;
    }
  }
}

function computePerPeriodAverages(
  frcMatchSubs: Array<{
    inputMode: string;
    periodData?: unknown;
    frcFieldEvents?: unknown;
  }>
): PerPeriodMap {
  const totals: PerPeriodMap = {
    AUTO: 0,
    TRANSITION: 0,
    SHIFT_1: 0,
    SHIFT_2: 0,
    SHIFT_3: 0,
    SHIFT_4: 0,
    END_GAME: 0,
  };
  for (const sub of frcMatchSubs) {
    addPerPeriodFromSub(totals, sub);
  }
  const matchCount = frcMatchSubs.length;
  const avg: PerPeriodMap = {};
  for (const [key, val] of Object.entries(totals)) {
    avg[key] = matchCount > 0 ? Math.round((val / matchCount) * 10) / 10 : 0;
  }
  return avg;
}

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
  },
  returns: v.any(),
  async handler(ctx, args) {
    const { profile } = await requireUserProfile(ctx);

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

      const frcMatchSubs = matchSubs
        .filter((s) => s.competitionType === "FRC")
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

      const frcPitSubs = pitSubs.filter((s) => s.competitionType === "FRC");
      const latestPit =
        frcPitSubs.sort((a, b) => b.createdAt - a.createdAt)[0] ?? null;

      const acc = emptyAccumulator();
      for (const sub of frcMatchSubs) {
        accumulateSubmission(acc, sub);
      }

      const base = buildAggregateFromAccumulator(
        teamNumber,
        acc,
        frcMatchSubs.length
      );
      const avgPerPeriodScoring = computePerPeriodAverages(frcMatchSubs);

      results.push({
        ...base,
        pitSubmission: latestPit,
        avgPerPeriodScoring,
        matchSubmissions: frcMatchSubs,
      });
    }

    return results;
  },
});
