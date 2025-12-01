"use client";

import { cn } from "@repo/ui/lib/utils";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export const SIDEBAR_EXIT_MS = 300;

export function RootTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const prevPathRef = useRef(pathname);
  const [isMounted, setIsMounted] = useState(false);
  const [showStyles, setShowStyles] = useState(pathname === "/");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const prevPath = prevPathRef.current;
    const isHome = pathname === "/";
    const wasScout = prevPath?.includes("/scout") ?? false;

    prevPathRef.current = pathname;

    if (wasScout && isHome) {
      const timer = setTimeout(() => setShowStyles(true), SIDEBAR_EXIT_MS);
      return () => clearTimeout(timer);
    }

    setShowStyles(isHome);
  }, [pathname]);

  return (
    <main
      className={cn(
        "flex h-svh flex-col [--header-height:calc(--spacing(14))]",
        isMounted &&
          "transition-[margin,max-width,border-color] duration-500 ease-in-out",
        showStyles
          ? "mx-[min(4rem,max(0px,calc((100vw-1536px)/2)))] max-w-screen-2xl"
          : "mx-0 w-full max-w-full",
        showStyles ? "my-[min(4rem,max(0px,calc((100vw-1536px)/2)))]" : "my-0",
        "2xl:border",
        showStyles ? "border-foreground" : "border-foreground/0"
      )}
    >
      {children}
    </main>
  );
}
