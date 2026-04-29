/// <reference lib="dom" />
import type {
  FrcMatchSubmissionSchema,
  FtcMatchSubmissionSchema,
} from "@/schema/scouting";
import { openOfflineCacheDb } from "./offline-cache";

const PENDING_SUBMISSIONS_STORE = "pendingSubmissions";

const QUEUE_CHANGED_EVENT = "decode-pending-queue-changed";
const FLUSH_SUBMISSIONS_TAG = "flush-submissions";

export const MAX_SUBMISSION_ATTEMPTS = 5;

function notifyQueueChanged(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new CustomEvent(QUEUE_CHANGED_EVENT));
}

export function subscribePendingQueueChanged(handler: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {
      //
    };
  }
  window.addEventListener(QUEUE_CHANGED_EVENT, handler);
  return () => window.removeEventListener(QUEUE_CHANGED_EVENT, handler);
}

type BackgroundSyncManagerLike = {
  register: (tag: string) => Promise<void>;
};

export async function requestBackgroundSyncFlush(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }
  try {
    const reg = await navigator.serviceWorker.ready;
    const sync = (
      reg as ServiceWorkerRegistration & { sync?: BackgroundSyncManagerLike }
    ).sync;
    if (sync?.register) {
      await sync.register(FLUSH_SUBMISSIONS_TAG);
    }
  } catch {
    // Background Sync is optional (unsupported browser or denied).
    await Promise.resolve();
  }
}

export type QueuedPitFrcPayload = {
  competitionType: "FRC";
  eventCode: string;
  eventName?: string;
  teamNumber: number;
  source?: "web";
  robotDimensions?: { length: number; width: number; height: number };
  drivetrainType?: "swerve" | "tank" | "other";
  photos?: string[];
  notes?: string;
  hopperCapacity?: number;
  shootingSpeed?: number;
  intakeMethods?: ("floor" | "depot" | "outpost")[];
  canPassTrench?: boolean;
  canCrossBump?: boolean;
  maxClimbLevel?: 0 | 1 | 2 | 3;
  autoCapabilities?: string;
  weight?: number;
};

export type QueuedPitFtcPayload = {
  competitionType: "FTC";
  eventCode: string;
  eventName?: string;
  teamNumber: number;
  source?: "web";
  robotDimensions?: { length: number; width: number; height: number };
  drivetrainType?: "swerve" | "tank" | "other";
  photos?: string[];
  notes?: string;
  intakeMethods?: ("floor" | "outpost")[];
  maxClimbLevel?: 0 | 1 | 2 | 3;
  canShootDeep?: boolean;
  autoCapabilities?: string;
  weight?: number;
};

export type QueuedPitPayload = QueuedPitFrcPayload | QueuedPitFtcPayload;

export type PendingSubmissionInput =
  | { type: "frc-match"; eventCode: string; payload: FrcMatchSubmissionSchema }
  | { type: "ftc-match"; eventCode: string; payload: FtcMatchSubmissionSchema }
  | { type: "pit"; payload: QueuedPitPayload };

export type PendingSubmissionRecord = PendingSubmissionInput & {
  id: number;
  queuedAt: number;
  attempts: number;
  lastError?: string;
};

type PendingRowInsert = Omit<PendingSubmissionRecord, "id">;

export async function enqueueSubmission(
  input: PendingSubmissionInput
): Promise<void> {
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDB is not available");
  }

  const db = await openOfflineCacheDb();
  const row: PendingRowInsert = {
    ...input,
    queuedAt: Date.now(),
    attempts: 0,
  };

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(PENDING_SUBMISSIONS_STORE, "readwrite");
    const store = tx.objectStore(PENDING_SUBMISSIONS_STORE);
    store.add(row);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });

  notifyQueueChanged();
  await requestBackgroundSyncFlush();
}

export async function getAllPendingSubmissions(): Promise<
  PendingSubmissionRecord[]
> {
  if (typeof indexedDB === "undefined") {
    return [];
  }

  const db = await openOfflineCacheDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PENDING_SUBMISSIONS_STORE, "readonly");
    const store = tx.objectStore(PENDING_SUBMISSIONS_STORE);
    const req = store.getAll();

    req.onsuccess = () => {
      db.close();
      resolve((req.result as PendingSubmissionRecord[]) ?? []);
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

export async function removeSubmission(id: number): Promise<void> {
  if (typeof indexedDB === "undefined") {
    return;
  }

  const db = await openOfflineCacheDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(PENDING_SUBMISSIONS_STORE, "readwrite");
    const store = tx.objectStore(PENDING_SUBMISSIONS_STORE);
    store.delete(id);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });

  notifyQueueChanged();
}

export async function markSubmissionFailed(
  id: number,
  errorMessage: string
): Promise<void> {
  if (typeof indexedDB === "undefined") {
    return;
  }

  const db = await openOfflineCacheDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(PENDING_SUBMISSIONS_STORE, "readwrite");
    const store = tx.objectStore(PENDING_SUBMISSIONS_STORE);
    const getReq = store.get(id);

    getReq.onsuccess = () => {
      const row = getReq.result as PendingSubmissionRecord | undefined;
      if (!row) {
        return;
      }
      store.put({
        ...row,
        attempts: row.attempts + 1,
        lastError: errorMessage,
      });
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
