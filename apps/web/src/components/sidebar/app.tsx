"use client";

import { cn } from "@repo/ui/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@repo/ui/shadcn/sidebar";
import { AnimatePresence, motion } from "motion/react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SIDEBAR_EXIT_MS } from "~/root-transition";
import { ThemeSwitcher } from "./theme";
import { Toggle } from "./toggle";

const MS_PER_SECOND = 1000;
const ENTER_DELAY_MS = 300;
const ENTER_DELAY = ENTER_DELAY_MS / MS_PER_SECOND;
const ENTER_DURATION = 0.5;
const EXIT_DURATION = SIDEBAR_EXIT_MS / MS_PER_SECOND;

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const prevPathRef = useRef(pathname);
  const [showGap, setShowGap] = useState(pathname?.includes("/scout") ?? false);

  const isScout = pathname?.includes("/scout") ?? false;
  const showDelay = prevPathRef.current === "/" && isScout;

  useEffect(() => {
    const wasHome = prevPathRef.current === "/";
    prevPathRef.current = pathname;

    if (isScout && wasHome) {
      const timer = setTimeout(() => setShowGap(true), ENTER_DELAY_MS);
      return () => clearTimeout(timer);
    }

    setShowGap(isScout);
  }, [pathname, isScout]);

  return (
    <AnimatePresence initial={false}>
      {isScout && (
        <motion.div
          animate={{ opacity: 1 }}
          className="h-[calc(100svh-var(--header-height))]"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          key="sidebar"
          onAnimationStart={() => {
            if (!showDelay) {
              setShowGap(true);
            }
          }}
          transition={{
            duration: showDelay ? ENTER_DURATION : EXIT_DURATION,
            delay: showDelay ? ENTER_DELAY : 0,
          }}
        >
          <Sidebar
            className={cn(
              "top-(--header-height) h-[calc(100svh-var(--header-height))]!",
              "[&>*[data-slot=sidebar-gap]]:transition-[width] [&>*[data-slot=sidebar-gap]]:ease-in-out",
              showGap
                ? "[&>*[data-slot=sidebar-gap]]:w-(--sidebar-width) [&>*[data-slot=sidebar-gap]]:duration-500"
                : "[&>*[data-slot=sidebar-gap]]:w-0 [&>*[data-slot=sidebar-gap]]:duration-300"
            )}
            pathname={pathname}
            {...props}
          >
            <SidebarHeader>
              <Toggle />
            </SidebarHeader>
            <SidebarContent />
            <SidebarFooter>
              <ThemeSwitcher />
            </SidebarFooter>
          </Sidebar>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
