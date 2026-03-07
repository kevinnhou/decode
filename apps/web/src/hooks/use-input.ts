import { useSyncExternalStore } from "react";
import {
  getInputMode,
  type InputMode,
  setInputMode,
  subscribeInputMode,
} from "@/lib/form/input";

export function useInput(): {
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
