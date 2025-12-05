import { useSyncExternalStore } from "react";
import {
  getInputMode,
  setInputMode,
  subscribeInputMode,
  type InputMode,
} from "@/lib/input-mode";

export function useInputMode(): {
  mode: InputMode;
  setMode: (mode: InputMode) => void;
} {
  const mode = useSyncExternalStore(subscribeInputMode, getInputMode, getInputMode);

  return {
    mode,
    setMode: setInputMode,
  };
}


