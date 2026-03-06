import { useCallback, useSyncExternalStore } from "react";
import {
  getShortcuts,
  resetShortcuts as resetShortcutsLib,
  type ScoutingShortcuts,
  setShortcuts,
  subscribeShortcuts,
} from "@/lib/shortcuts";

export function useScoutingShortcuts(): {
  shortcuts: ScoutingShortcuts;
  setShortcut: (action: keyof ScoutingShortcuts, key: string) => void;
  resetShortcuts: () => void;
} {
  const shortcuts = useSyncExternalStore(
    subscribeShortcuts,
    getShortcuts,
    getShortcuts
  );

  const setShortcut = useCallback(
    (action: keyof ScoutingShortcuts, key: string) => {
      const current = getShortcuts();

      const conflicting = (
        Object.keys(current) as (keyof ScoutingShortcuts)[]
      ).find((a) => a !== action && current[a] === key);

      if (conflicting) {
        setShortcuts({
          ...current,
          [action]: key,
          [conflicting]: current[action],
        });
      } else {
        setShortcuts({ ...current, [action]: key });
      }
    },
    []
  );

  const resetShortcuts = useCallback(() => {
    resetShortcutsLib();
  }, []);

  return { shortcuts, setShortcut, resetShortcuts };
}
