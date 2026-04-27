import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireUserProfile } from "./auth";
import { competitionTypeValidator } from "./schema";

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

type FtcPeriodDataDoc = {
  auto: { made: number; missed: number };
  teleop: { made: number; missed: number };
};

type FtcFieldEventDoc = {
  event: string;
  count: number;
  coordinates: { x: number; y: number };
  timestamp: string;
};

function ftcPeriodMakes(sub: {
  inputMode: string;
  ftcPeriodData?: FtcPeriodDataDoc;
  autonomousMade?: number;
  teleopMade?: number;
  fieldEvents?: FtcFieldEventDoc[];
}): { auto: number; teleop: number } {
  if (sub.ftcPeriodData) {
    return {
      auto: sub.ftcPeriodData.auto.made,
      teleop: sub.ftcPeriodData.teleop.made,
    };
  }
  let auto = sub.autonomousMade ?? 0;
  let teleop = sub.teleopMade ?? 0;
  if (auto === 0 && teleop === 0 && sub.fieldEvents) {
    for (const e of sub.fieldEvents) {
      if (e.event === "autonomous_made") {
        auto += e.count;
      }
      if (e.event === "teleop_made") {
        teleop += e.count;
      }
    }
  }
  return { auto, teleop };
}

function ftcMakesPerSubmission(
  sub: Parameters<typeof ftcPeriodMakes>[0]
): number {
  const { auto, teleop } = ftcPeriodMakes(sub);
  return auto + teleop;
}

function ftcDefensePerSubmission(sub: { tags?: string[] }): number {
  const tags = sub.tags ?? [];
  return tags.some((t) => t.toLowerCase() === "defense") ? 1 : 0;
}

function accumulateFtcSubmission(
  acc: TeamAccumulator,
  sub: {
    climbLevel?: number;
    climbDuration?: number;
    inputMode: string;
    tags?: string[];
  } & Parameters<typeof ftcPeriodMakes>[0]
): void {
  if ((sub.climbLevel ?? 0) > 0) {
    acc.climbSuccess += 1;
  }
  acc.totalClimbLevel += sub.climbLevel ?? 0;
  if (sub.climbDuration && sub.climbDuration > 0) {
    acc.totalClimbDuration += sub.climbDuration;
    acc.climbDurationCount += 1;
  }

  acc.totalScoring += ftcMakesPerSubmission(sub);
  acc.totalDefense += ftcDefensePerSubmission(sub);

  if (sub.inputMode === "form") {
    acc.formCount += 1;
  } else {
    acc.fieldCount += 1;
  }
}

function computeFtcPerPeriodAverages(
  ftcSubs: Parameters<typeof ftcPeriodMakes>[0][]
): Record<string, number> {
  const n = ftcSubs.length;
  if (n === 0) {
    return { AUTO: 0, TELEOP: 0 };
  }
  let autoSum = 0;
  let teleopSum = 0;
  for (const sub of ftcSubs) {
    const { auto, teleop } = ftcPeriodMakes(sub);
    autoSum += auto;
    teleopSum += teleop;
  }
  return {
    AUTO: Math.round((autoSum / n) * 10) / 10,
    TELEOP: Math.round((teleopSum / n) * 10) / 10,
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
    })[] = [];

    for (const [teamNumber, teamSubs] of teamMap) {
      const acc = emptyAccumulator();
      for (const sub of teamSubs) {
        if (competitionType === "FTC") {
          accumulateFtcSubmission(acc, sub);
        } else {
          accumulateSubmission(acc, sub);
        }
      }
      aggregates.push({
        ...buildAggregateFromAccumulator(teamNumber, acc, teamSubs.length),
        pitCount: pitCountMap.get(teamNumber) ?? 0,
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
          accumulateSubmission(acc, sub);
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
          : computePerPeriodAverages(typedMatchSubs);

      results.push({
        ...base,
        pitSubmission: latestPit,
        avgPerPeriodScoring,
        matchSubmissions: typedMatchSubs,
      });
    }

    return results;
  },
});
