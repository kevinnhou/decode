"use client";

import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import type * as React from "react";
import { Toaster } from "sonner";

function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}

function ToasterProvider() {
  const { theme } = useTheme() as {
    theme: "light" | "dark" | "system";
  };
  return <Toaster position="bottom-center" richColors theme={theme} />;
}

export function UIProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      disableTransitionOnChange
      enableSystem={false}
    >
      {children}
      <ToasterProvider />
    </ThemeProvider>
  );
}
