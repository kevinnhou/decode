"use client";

import { memo } from "react";

export const MatchPeriodBar = memo(function MatchPeriodBarInner({
  elapsedInPeriod,
  periodDuration,
}: {
  elapsedInPeriod: number;
  periodDuration: number;
}) {
  const pct =
    periodDuration > 0
      ? Math.max(0, (1 - elapsedInPeriod / periodDuration) * 100)
      : 0;
  return (
    <div
      className="h-full rounded-full bg-primary transition-[width] duration-1000 ease-linear"
      style={{ width: `${pct}%` }}
    />
  );
});
