"use client";

import { cn } from "@repo/ui/lib/utils";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

interface RootTransitionProps {
  children: React.ReactNode;
}

export function RootTransition({ children }: RootTransitionProps) {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const isHome = pathname === "/";

  return (
    <main
      className={cn(
        "flex min-h-svh flex-col [--header-height:calc(--spacing(14))]",
        isMounted &&
          "transition-[margin-top,margin-bottom,margin-left,margin-right,max-width,border-color] duration-500 ease-in-out",
        isHome
          ? "mx-[min(4rem,max(0px,calc((100vw-1536px)/2)))] max-w-screen-2xl"
          : "mx-0 w-full max-w-full",
        isHome ? "my-[min(4rem,max(0px,calc((100vw-1536px)/2)))]" : "my-0",
        "2xl:border",
        isHome ? "border-foreground" : "border-foreground/0"
      )}
    >
      {children}
    </main>
  );
}
