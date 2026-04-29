"use client";

import { api } from "@decode/backend/convex/_generated/api";
import { toast } from "@decode/ui/components/sonner";
import { useMutation } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  PendingSubmissionRecord,
  QueuedPitPayload,
} from "@/lib/pending-submissions";
import {
  getAllPendingSubmissions,
  markSubmissionFailed,
  removeSubmission,
  subscribePendingQueueChanged,
} from "@/lib/pending-submissions";
import {
  frcMatchSubmissionSchema,
  ftcMatchSubmissionSchema,
} from "@/schema/scouting";

function frcPayloadToConvexArgs(
  eventCode: string,
  payload: ReturnType<typeof frcMatchSubmissionSchema.parse>
) {
  return {
    eventCode,
    eventName: undefined as string | undefined,
    teamNumber: payload.meta.teamNumber,
    matchNumber: payload.meta.matchNumber,
    matchStage: payload.meta.matchStage,
    allianceColour: payload.meta.allianceColour,
    source: "web" as const,
    climbLevel: payload.climbLevel,
    climbDuration: payload.climbDuration,
    notes: payload.notes,
    periodData: payload.periodData,
    frcFieldEvents: payload.frcFieldEvents,
    autoPath: payload.autoPath,
  };
}

function ftcPayloadToConvexArgs(
  eventCode: string,
  payload: ReturnType<typeof ftcMatchSubmissionSchema.parse>
) {
  const pd = payload.periodData;
  return {
    eventCode,
    eventName: undefined as string | undefined,
    teamNumber: payload.meta.teamNumber,
    matchNumber: payload.meta.matchNumber,
    matchStage: payload.meta.matchStage,
    allianceColour: payload.meta.allianceColour,
    inputMode: payload.inputMode,
    source: "web" as const,
    autonomousMade: pd?.auto.made ?? 0,
    autonomousMissed: pd?.auto.missed ?? 0,
    teleopMade: pd?.teleop.made ?? 0,
    teleopMissed: pd?.teleop.missed ?? 0,
    ftcPeriodData: pd,
    tags: [] as string[],
    fieldEvents: payload.ftcFieldEvents,
  };
}

type Submitters = {
  submitMatchFrc: (
    args: ReturnType<typeof frcPayloadToConvexArgs>
  ) => Promise<unknown>;
  submitMatchFtc: (
    args: ReturnType<typeof ftcPayloadToConvexArgs>
  ) => Promise<unknown>;
  submitPitMut: (args: QueuedPitPayload) => Promise<unknown>;
};

async function pushOnePendingItem(
  item: PendingSubmissionRecord,
  submitters: Submitters
): Promise<void> {
  const { submitMatchFrc, submitMatchFtc, submitPitMut } = submitters;
  if (item.type === "frc-match") {
    const validated = frcMatchSubmissionSchema.parse(item.payload);
    await submitMatchFrc(frcPayloadToConvexArgs(item.eventCode, validated));
    return;
  }
  if (item.type === "ftc-match") {
    const validated = ftcMatchSubmissionSchema.parse(item.payload);
    await submitMatchFtc(ftcPayloadToConvexArgs(item.eventCode, validated));
    return;
  }
  await submitPitMut(item.payload);
}

function runPromise(p: Promise<unknown>): void {
  p.catch(() => {
    // Best-effort: refresh/flush must not surface as unhandled rejection.
  });
}

/**
 * Flushes IndexedDB pending submissions via Convex (same payloads as server actions).
 * Listens for `online` and service worker `FLUSH_QUEUE` messages.
 */
export function useSyncQueue(): {
  pendingCount: number;
  isFlushing: boolean;
  refreshPendingCount: () => Promise<void>;
} {
  const submitMatchFrc = useMutation(api.submissions.submitMatch);
  const submitMatchFtc = useMutation(api.submissions.submitMatchFTC);
  const submitPitMut = useMutation(api.submissions.submitPit);

  const [pendingCount, setPendingCount] = useState(0);
  const [isFlushing, setIsFlushing] = useState(false);
  const flushing = useRef(false);

  const refreshPendingCount = useCallback(async () => {
    const all = await getAllPendingSubmissions();
    setPendingCount(all.length);
  }, []);

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: offline queue flush orchestration
  const flush = useCallback(async () => {
    if (flushing.current) {
      return;
    }
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return;
    }

    flushing.current = true;
    setIsFlushing(true);
    const before = await getAllPendingSubmissions();
    try {
      const pending = await getAllPendingSubmissions();
      setPendingCount(pending.length);

      const submitters = { submitMatchFrc, submitMatchFtc, submitPitMut };

      for (const item of pending) {
        try {
          await pushOnePendingItem(item, submitters);
          await removeSubmission(item.id);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          await markSubmissionFailed(item.id, message);
        }
      }

      const remaining = await getAllPendingSubmissions();
      setPendingCount(remaining.length);

      if (before.length > 0 && remaining.length === 0) {
        toast.success("All offline submissions synced");
      }
    } finally {
      flushing.current = false;
      setIsFlushing(false);
    }
  }, [submitMatchFrc, submitMatchFtc, submitPitMut]);

  useEffect(() => {
    runPromise(refreshPendingCount());
  }, [refreshPendingCount]);

  useEffect(() => {
    const unsub = subscribePendingQueueChanged(() => {
      runPromise(refreshPendingCount());
    });
    return unsub;
  }, [refreshPendingCount]);

  useEffect(() => {
    const onOnline = () => {
      runPromise(flush());
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [flush]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "FLUSH_QUEUE") {
        runPromise(flush());
      }
    };
    navigator.serviceWorker?.addEventListener("message", onMessage);
    return () =>
      navigator.serviceWorker?.removeEventListener("message", onMessage);
  }, [flush]);

  useEffect(() => {
    runPromise(flush());
  }, [flush]);

  return { pendingCount, isFlushing, refreshPendingCount };
}
