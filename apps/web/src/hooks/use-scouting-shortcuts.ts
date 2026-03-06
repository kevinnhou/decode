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
      setShortcuts({ ...getShortcuts(), [action]: key });
    },
    []
  );

  const resetShortcuts = useCallback(() => {
    resetShortcutsLib();
  }, []);

  return { shortcuts, setShortcut, resetShortcuts };
}
