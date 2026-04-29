import type { SpreadsheetConfigSchema } from "@/schema/scouting";

function normaliseCode(value: string): string {
  return value.trim().toUpperCase();
}

function getItem<T>(key: string, defaultValue: T): T {
  if (typeof window === "undefined") {
    return defaultValue;
  }

  try {
    const stored = localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setItem<T>(key: string, value: T): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(key, JSON.stringify(value));
}

export const SPREADSHEET_CONFIG_STORAGE_KEY = "spreadsheetConfig";
const SPREADSHEET_CONFIG_KEY = SPREADSHEET_CONFIG_STORAGE_KEY;
const TEAM_MAP_KEY = "teamsMap";

let spreadsheetConfigRevision = 0;
const spreadsheetConfigListeners = new Set<() => void>();
let spreadsheetStorageListenerAttached = false;

function bumpSpreadsheetConfigRevision() {
  spreadsheetConfigRevision += 1;
  for (const listener of spreadsheetConfigListeners) {
    listener();
  }
}

function attachSpreadsheetConfigStorageSync() {
  if (typeof window === "undefined" || spreadsheetStorageListenerAttached) {
    return;
  }
  spreadsheetStorageListenerAttached = true;
  window.addEventListener("storage", (e: StorageEvent) => {
    if (e.key === SPREADSHEET_CONFIG_STORAGE_KEY || e.key === null) {
      bumpSpreadsheetConfigRevision();
    }
  });
}

export function subscribeSpreadsheetConfig(listener: () => void): () => void {
  attachSpreadsheetConfigStorageSync();
  spreadsheetConfigListeners.add(listener);
  return () => {
    spreadsheetConfigListeners.delete(listener);
  };
}

export function getSpreadsheetConfigRevision(): number {
  return spreadsheetConfigRevision;
}

export function getConfig(): SpreadsheetConfigSchema | null {
  const raw = getItem<SpreadsheetConfigSchema | null>(
    SPREADSHEET_CONFIG_KEY,
    null
  );
  if (!raw) {
    return null;
  }
  return { ...raw, eventCode: normaliseCode(raw.eventCode) };
}

export function setConfig(config: SpreadsheetConfigSchema): void {
  const next: SpreadsheetConfigSchema = {
    ...config,
    eventCode: normaliseCode(config.eventCode),
  };
  setItem(SPREADSHEET_CONFIG_KEY, next);
  bumpSpreadsheetConfigRevision();
}

export function getTeamsMap(): Record<string, string> {
  return getItem(TEAM_MAP_KEY, {});
}

export function setTeamsMap(map: Record<string, string>): void {
  setItem(TEAM_MAP_KEY, map);
}
