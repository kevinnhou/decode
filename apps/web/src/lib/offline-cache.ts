/**
 * Client-side offline cache for FRC event data.
 * Syncs Convex data to IndexedDB for use when offline.
 *
 * @param eventCode - The event code to sync data for
 * @param data - The data to sync
 * @returns A promise that resolves when the data is synced
 */

const DB_NAME = "decode-offline-cache";
const DB_VERSION = 1;
const STORE_NAME = "eventData";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME, { keyPath: "eventCode" });
    };
  });
}

export type CachedEventData = {
  eventCode: string;
  duties: unknown[];
  schedule: unknown[];
  teams: unknown[];
  syncedAt: number;
};

export async function syncEventData(
  eventCode: string,
  data: {
    duties?: unknown[];
    schedule?: unknown[];
    teams?: unknown[];
  }
): Promise<void> {
  if (typeof indexedDB === "undefined") {
    return;
  }

  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const existing = store.get(eventCode);

    existing.onsuccess = () => {
      const existingData = (existing.result as CachedEventData | undefined) ?? {
        eventCode,
        duties: [],
        schedule: [],
        teams: [],
        syncedAt: 0,
      };

      const merged: CachedEventData = {
        eventCode,
        duties: data.duties ?? existingData.duties,
        schedule: data.schedule ?? existingData.schedule,
        teams: data.teams ?? existingData.teams,
        syncedAt: Date.now(),
      };

      store.put(merged);
    };

    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function getCachedEventData(
  eventCode: string
): Promise<CachedEventData | null> {
  if (typeof indexedDB === "undefined") {
    return null;
  }

  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(eventCode);

    req.onsuccess = () => {
      db.close();
      resolve((req.result as CachedEventData) ?? null);
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

export function isOffline(): boolean {
  return typeof navigator !== "undefined" && !navigator.onLine;
}
