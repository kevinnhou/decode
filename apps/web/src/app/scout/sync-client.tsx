"use client";

import { CloudUpload } from "lucide-react";
import { useSyncQueue } from "@/hooks/use-sync-queue";

export function SyncClient() {
  const { pendingCount, isFlushing } = useSyncQueue();

  if (pendingCount === 0) {
    return null;
  }

  return (
    <output
      aria-live="polite"
      className="pointer-events-none fixed right-4 bottom-20 z-50 flex max-w-[min(100vw-2rem,20rem)] items-center gap-2 rounded-lg border border-border bg-background/95 px-3 py-2 text-xs shadow-md backdrop-blur supports-backdrop-filter:bg-background/80"
    >
      <CloudUpload
        aria-hidden
        className={`size-4 shrink-0 text-primary ${isFlushing ? "animate-pulse" : ""}`}
      />
      <span className="text-muted-foreground">
        {pendingCount} submission{pendingCount === 1 ? "" : "s"} saved offline
        {isFlushing ? ", syncing…" : ". They upload when you're online."}
      </span>
    </output>
  );
}
