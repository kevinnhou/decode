"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@repo/ui/shadcn/sidebar";
import { ThemeSwitcher } from "./theme";
import { Toggle } from "./toggle";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar
      className="top-(--header-height) h-[calc(100svh-var(--header-height))]!"
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
  );
}
