"use client";

import { useSidebar } from "@decode/ui/components/sidebar";
import { ArrowRightLeft } from "lucide-react";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";

export function ScoutType() {
  const pathname = usePathname();
  const { state } = useSidebar();
  const router = useRouter();
  const isCollapsed = state === "collapsed";

  const segments = pathname?.match(/^\/scout\/(ftc|frc)\/(match|pit)(?:\/|$)/);

  if (!segments) {
    return null;
  }

  const competition = segments[1];
  const isMatch = segments[2] === "match";
  const targetType = isMatch ? "pit" : "match";
  const label = isMatch ? "Switch to Pit Scouting" : "Switch to Match Scouting";

  function handleSwitch() {
    router.push(`/scout/${competition}/${targetType}` as Route);
  }

  return (
    <div className="px-3">
      <button
        className="flex w-full items-center gap-2 py-1 text-muted-foreground/60 text-xs transition-colors hover:text-muted-foreground"
        onClick={handleSwitch}
        type="button"
      >
        <ArrowRightLeft className="size-3 shrink-0" />
        {!isCollapsed && <span>{label}</span>}
      </button>
    </div>
  );
}
