"use client";

import { useSyncExternalStore } from "react";

function subscribeOnline(callback: () => void) {
  if (typeof window === "undefined") {
    return () => {
      //
    };
  }
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getSnapshotOnline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine;
}

function getServerSnapshotOnline(): boolean {
  return true;
}

export function useIsOnline(): boolean {
  return useSyncExternalStore(
    subscribeOnline,
    getSnapshotOnline,
    getServerSnapshotOnline
  );
}
