"use client";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@decode/ui/components/sidebar";
import { cn } from "@decode/ui/lib/utils";
import { Check } from "lucide-react";
import { useEffect, useState } from "react";

export type SectionStatus = {
  id: string;
  label: string;
  completed: boolean;
};

type PitSectionsState = {
  sections: SectionStatus[];
  activeIndex: number;
  onNavigate: (index: number) => void;
};

let currentState: PitSectionsState | null = null;
const subscribers = new Set<(state: PitSectionsState | null) => void>();

export function setPitSectionsState(state: PitSectionsState | null) {
  currentState = state;
  for (const subscriber of subscribers) {
    subscriber(state);
  }
}

export function PitSections() {
  const [state, setState] = useState<PitSectionsState | null>(currentState);

  useEffect(() => {
    const handler = (newState: PitSectionsState | null) => {
      setState(newState);
    };
    subscribers.add(handler);
    if (currentState !== null) {
      setState(currentState);
    }
    return () => {
      subscribers.delete(handler);
    };
  }, []);

  if (!state) {
    return null;
  }

  return (
    <SidebarGroup className="gap-2 px-0 py-0">
      <SidebarGroupLabel className="px-2 py-0.5 text-[10px] uppercase tracking-wider">
        Sections
      </SidebarGroupLabel>

      <SidebarGroupContent>
        <SidebarMenu>
          {state.sections.map((section, index) => {
            const isActive = index === state.activeIndex;
            const isCompleted = section.completed;

            return (
              <SidebarMenuItem key={section.id}>
                <SidebarMenuButton
                  className="h-8 gap-2.5 rounded-xl px-2 font-normal"
                  isActive={isActive}
                  onClick={() => state.onNavigate(index)}
                  type="button"
                >
                  <div
                    className={cn(
                      "flex size-4.5 shrink-0 items-center justify-center rounded-full border text-[10px] leading-none transition-colors",
                      isCompleted
                        ? "border-sidebar-primary bg-sidebar-primary text-sidebar-primary-foreground"
                        : isActive
                          ? "border-sidebar-primary text-sidebar-primary"
                          : "border-sidebar-border text-sidebar-foreground/70"
                    )}
                  >
                    {isCompleted ? (
                      <Check className="size-2.5" />
                    ) : (
                      <span className="font-mono text-sidebar-foreground/70">
                        {index + 1}
                      </span>
                    )}
                  </div>
                  <span className="italic">{section.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
