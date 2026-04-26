"use client";

import { api } from "@decode/backend/convex/_generated/api";
import type { Doc } from "@decode/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useConfigRevision } from "@/hooks/use-config-revision";
import { getConfig } from "@/lib/config";

/**
 * Fetches the current scout's active duties for the configured event.
 * Returns null when no event is configured or when not authenticated.
 *
 * @returns Object with duties array (or null) and isLoading flag
 */
export function useMyDuties(): {
  duties: Doc<"scoutingDuties">[] | null;
  isLoading: boolean;
} {
  useConfigRevision();
  const config = getConfig();
  const eventCode = config?.eventCode?.trim() ?? null;

  const duties = useQuery(
    api.duties.listMyDuties,
    eventCode ? { eventCode } : "skip"
  );

  const isLoading = eventCode !== null && duties === undefined;

  return {
    duties: duties ?? null,
    isLoading,
  };
}
