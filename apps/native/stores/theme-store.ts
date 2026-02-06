import { Uniwind, useUniwind } from "uniwind";
import { create } from "zustand";

type ThemeName = "light" | "dark";

type ThemeState = {
  currentTheme: ThemeName;
  isLight: boolean;
  isDark: boolean;
  setTheme: (theme: ThemeName) => void;
  toggleTheme: () => void;
};

export const useThemeStore = create<ThemeState>((set, get) => ({
  currentTheme: "light",
  isLight: true,
  isDark: false,
  setTheme: (theme: ThemeName) => {
    Uniwind.setTheme(theme);
    set({
      currentTheme: theme,
      isLight: theme === "light",
      isDark: theme === "dark",
    });
  },
  toggleTheme: () => {
    const currentTheme = get().currentTheme;
    const newTheme = currentTheme === "light" ? "dark" : "light";
    Uniwind.setTheme(newTheme);
    set({
      currentTheme: newTheme,
      isLight: newTheme === "light",
      isDark: newTheme === "dark",
    });
  },
}));

export const useThemeSync = () => {
  const { theme } = useUniwind();
  const setTheme = useThemeStore((state) => state.setTheme);

  if (theme !== useThemeStore.getState().currentTheme) {
    setTheme(theme as ThemeName);
  }

  return useThemeStore();
};
