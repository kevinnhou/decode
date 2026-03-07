"use client";

import { useCallback, useEffect, useState } from "react";
import {
  type CachedEventData,
  getCachedEventData,
  isOffline,
  syncEventData,
} from "@/lib/offline-cache";

/**
 * Fetches event schedule from Convex, with offline fallback to IndexedDB cache.
 * Call syncToOffline() when data is loaded to cache for offline use.
 *
 * getTeamForPosition: primary schedule consumer.
 * This hook provides cache sync and offline read.
 *
 * schedule query: requires a new Convex query
 */
export function useEventSchedule(eventCode: string | null) {
  const [cached, setCached] = useState<CachedEventData | null>(null);
  const [lastSynced, setLastSynced] = useState<number | null>(null);

  const syncToOffline = useCallback(
    async (data: {
      duties?: unknown[];
      schedule?: unknown[];
      teams?: unknown[];
    }) => {
      if (!eventCode) {
        return;
      }
      try {
        await syncEventData(eventCode, data);
        setLastSynced(Date.now());
      } catch {
        //
      }
    },
    [eventCode]
  );

  useEffect(() => {
    if (!eventCode) {
      return;
    }

    if (isOffline()) {
      getCachedEventData(eventCode).then(setCached);
    } else {
      setCached(null);
    }
  }, [eventCode]);

  return {
    cachedData: cached,
    lastSynced,
    syncToOffline,
    isOffline: isOffline(),
  };
}
