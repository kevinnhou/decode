import type { SpreadsheetConfigSchema } from "@/schema/scouting";

const STORAGE_KEY = "spreadsheetConfig";

export function getConfig(): SpreadsheetConfigSchema | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return null;
    }
    return JSON.parse(stored) as SpreadsheetConfigSchema;
  } catch {
    return null;
  }
}

export function setConfig(config: SpreadsheetConfigSchema): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function cleaConfig(): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(STORAGE_KEY);
}
