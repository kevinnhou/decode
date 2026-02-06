/** biome-ignore-all lint/nursery/noLeakedRender: PASS */

"use client";

import {
  SidebarGroup,
  SidebarGroupContent,
  useSidebar,
} from "@decode/ui/components/sidebar";
import { cn } from "@decode/ui/lib/utils";
import { Form, Map as MapIcon } from "lucide-react";
import { useInputMode } from "@/hooks/use-input-mode";

export function Toggle() {
  const { state } = useSidebar();
  const { mode, setMode } = useInputMode();
  const isCollapsed = state === "collapsed";

  const modes = [
    {
      name: "Form Input",
      description: "Traditional data entry",
      icon: Form,
      value: "form" as const,
    },
    {
      name: "Field Input",
      description: "Map view for data entry",
      icon: MapIcon,
      value: "field" as const,
    },
  ];

  function handleModeChange(value: "form" | "field") {
    setMode(value);
  }

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <div className="flex flex-col gap-2 px-1">
          {modes.map((modeOption) => {
            const isActive = mode === modeOption.value;

            return (
              <button
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors",
                  "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  isActive &&
                    "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
                  isCollapsed && "justify-center px-2"
                )}
                key={modeOption.name}
                onClick={() => handleModeChange(modeOption.value)}
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
                  <modeOption.icon className="size-4" />
                </div>

                {!isCollapsed && (
                  <div className="flex flex-col">
                    <span className="font-medium text-sm">
                      {modeOption.name}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {modeOption.description}
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
