import type { FtcFieldEventDoc, FtcPeriodDataDoc } from "./types";

export type FtcPeriodMakes = { auto: number; teleop: number };

export function ftcPeriodMakes(sub: {
  inputMode?: string;
  ftcPeriodData?: FtcPeriodDataDoc | null;
  autonomousMade?: number;
  teleopMade?: number;
  fieldEvents?: FtcFieldEventDoc[] | null;
}): FtcPeriodMakes {
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

export function ftcTotalMakes(
  sub: Parameters<typeof ftcPeriodMakes>[0]
): number {
  const { auto, teleop } = ftcPeriodMakes(sub);
  return auto + teleop;
}

export function ftcDefenseFlag(sub: { tags?: string[] | null }): number {
  const tags = sub.tags ?? [];
  return tags.some((t) => t.toLowerCase() === "defense") ? 1 : 0;
}

export function computeFtcPerPeriodAverages(
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
