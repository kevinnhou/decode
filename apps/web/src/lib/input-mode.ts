export type InputMode = "form" | "field";

type Listener = (mode: InputMode) => void;

let currentMode: InputMode = "form";

const listeners = new Set<Listener>();

export function getInputMode(): InputMode {
  return currentMode;
}

export function setInputMode(nextMode: InputMode): void {
  if (nextMode === currentMode) {
    return;
  }

  currentMode = nextMode;
  listeners.forEach((listener) => {
    listener(currentMode);
  });
}

export function subscribeInputMode(listener: Listener): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}
