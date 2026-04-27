export interface ScoutingShortcuts {
  scoring: string;
  feeding: string;
  defense: string;
  matchTimer: string;
  ftcMade: string;
  ftcMissed: string;
  ftcMadeDecrement: string;
  ftcMissedDecrement: string;
}

export const SHORTCUT_LABELS: Record<keyof ScoutingShortcuts, string> = {
  scoring: "Scoring (FRC)",
  feeding: "Feeding (FRC)",
  defense: "Defence (FRC)",
  matchTimer: "Match Timer",
  ftcMade: "Made + (FTC)",
  ftcMissed: "Missed + (FTC)",
  ftcMadeDecrement: "Made − (FTC)",
  ftcMissedDecrement: "Missed − (FTC)",
};

export const DEFAULT_SHORTCUTS: ScoutingShortcuts = {
  scoring: "s",
  feeding: "f",
  defense: "d",
  matchTimer: " ",
  ftcMade: "m",
  ftcMissed: "x",
  ftcMadeDecrement: "n",
  ftcMissedDecrement: "z",
};

const SHORTCUTS_KEY = "scoutingShortcuts";

type Listener = () => void;

const listeners = new Set<Listener>();

let cachedSnapshot: ScoutingShortcuts | null = null;

function readFromStorage(): ScoutingShortcuts {
  if (typeof window === "undefined") {
    return DEFAULT_SHORTCUTS;
  }

  try {
    const stored = localStorage.getItem(SHORTCUTS_KEY);
    if (!stored) {
      return DEFAULT_SHORTCUTS;
    }
    return {
      ...DEFAULT_SHORTCUTS,
      ...(JSON.parse(stored) as Partial<ScoutingShortcuts>),
    };
  } catch {
    return DEFAULT_SHORTCUTS;
  }
}

function notifyListeners(): void {
  cachedSnapshot = null;
  for (const listener of listeners) {
    listener();
  }
}

export function getShortcuts(): ScoutingShortcuts {
  if (cachedSnapshot === null) {
    cachedSnapshot = readFromStorage();
  }
  return cachedSnapshot;
}

export function setShortcuts(shortcuts: ScoutingShortcuts): void {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(SHORTCUTS_KEY, JSON.stringify(shortcuts));
  notifyListeners();
}

export function resetShortcuts(): void {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.removeItem(SHORTCUTS_KEY);
  notifyListeners();
}

export function subscribeShortcuts(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function formatShortcutKey(key: string): string {
  if (key === " ") {
    return "Space";
  }
  return key.toUpperCase();
}
