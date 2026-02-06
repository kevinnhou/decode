export const baseColours = [
  {
    name: "mono",
    label: "Mono",
    activeColour: {
      light: "oklch(0.9 0 0)",
      dark: "oklch(0.1 0 0)",
    },
  },
  {
    name: "claude",
    label: "Claude",
    activeColour: {
      light: "oklch(0.56 0.13 43.00)",
      dark: "oklch(0.56 0.13 43.00)",
    },
  },
  {
    name: "paper",
    label: "Paper",
    activeColour: {
      light: "oklch(0.62 0.08 65.54)",
      dark: "oklch(0.73 0.06 66.7)",
    },
  },
] as const;

export type BaseColor = (typeof baseColours)[number];
