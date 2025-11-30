"use client";

import { cn } from "@repo/ui/lib/utils";
import {
  SidebarGroup,
  SidebarGroupContent,
  useSidebar,
} from "@repo/ui/shadcn/sidebar";
// biome-ignore lint/suspicious/noShadowRestrictedNames: PASS
import { Form, Map } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function Toggle() {
  const router = useRouter();
  const pathname = usePathname();
  const { state } = useSidebar();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const isCollapsed = isClient ? state === "collapsed" : false;
  const isOffline = isClient ? pathname?.includes("offline") : false;

  const modes = [
    {
      name: "Form Input",
      description: "Traditional data entry",
      icon: Form,
      route: isOffline ? "/scout/~offline" : "/scout",
    },
    {
      name: "Field Input",
      description: "Map view for data entry",
      icon: Map,
      route: isOffline ? "/dashboard/~offline" : "/dashboard",
    },
  ];

  // route => state

  function handleModeChange(route: string) {
    router.push(route);
  }

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <div className="flex flex-col gap-2 px-1">
          {modes.map((mode) => {
            const isActive = isClient
              ? pathname?.startsWith(mode.route)
              : false;

            return (
              <button
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors",
                  "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  isActive &&
                    "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
                  isCollapsed && "justify-center px-2"
                )}
                key={mode.name}
                onClick={() => handleModeChange(mode.route)}
                type="button"
              >
                <div
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-md border",
                    isActive
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-sidebar-border"
                  )}
                >
                  <mode.icon className="size-4" />
                </div>

                {!isCollapsed && (
                  <div className="flex flex-col">
                    <span className="font-medium text-sm">{mode.name}</span>
                    <span className="text-muted-foreground text-xs">
                      {mode.description}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
