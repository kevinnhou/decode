import type { SpreadsheetConfigSchema } from "@/schema/scouting";

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

const SPREADSHEET_CONFIG_KEY = "spreadsheetConfig";
const TEAM_MAP_KEY = "teamsMap";

export function getConfig(): SpreadsheetConfigSchema | null {
  return getItem(SPREADSHEET_CONFIG_KEY, null);
}

export function setConfig(config: SpreadsheetConfigSchema): void {
  setItem(SPREADSHEET_CONFIG_KEY, config);
}

export function getTeamsMap(): Record<string, string> {
  return getItem(TEAM_MAP_KEY, {});
}

export function setTeamsMap(map: Record<string, string>): void {
  setItem(TEAM_MAP_KEY, map);
}
