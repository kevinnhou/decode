import { useSyncExternalStore } from "react";
import {
  getInputMode,
  type InputMode,
  setInputMode,
  subscribeInputMode,
} from "@/lib/input-mode";

export function useInputMode(): {
  mode: InputMode;
  setMode: (mode: InputMode) => void;
} {
  const mode = useSyncExternalStore(
    subscribeInputMode,
    getInputMode,
    getInputMode
  );

  return {
    mode,
    setMode: setInputMode,
  };
}
