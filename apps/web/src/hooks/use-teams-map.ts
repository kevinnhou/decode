"use client";

import { api } from "@decode/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { useEffect } from "react";
import { useConfigRevision } from "@/hooks/use-config-revision";
import { getConfig, getTeamsMap, setTeamsMap } from "@/lib/config";

/**
 * Subscribes to the org's teamMaps document in Convex and syncs any
 * updates to localStorage. (ONLINE)
 *
 * Falls back to the locally cached copy from localStorage. (OFFLINE)
 *
 * @returns The team map for the currently configured event
 */
export function useTeamsMap(): Record<string, string> {
  useConfigRevision();
  const eventCode = getConfig()?.eventCode ?? "";

  const result = useQuery(
    api.teams.getTeamsMapForEvent,
    eventCode ? { eventCode } : "skip"
  );

  useEffect(() => {
    if (!result?.map) {
      return;
    }
    const map = result.map as Record<string, string>;
    setTeamsMap(map);
  }, [result]);

  if (result?.map) {
    return result.map as Record<string, string>;
  }

  return getTeamsMap();
}
