"use client";

import { useSyncExternalStore } from "react";
import {
  getSpreadsheetConfigRevision,
  subscribeSpreadsheetConfig,
} from "@/lib/config";

export function useConfigRevision(): number {
  return useSyncExternalStore(
    subscribeSpreadsheetConfig,
    getSpreadsheetConfigRevision,
    getSpreadsheetConfigRevision
  );
}
