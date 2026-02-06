/** biome-ignore-all lint/nursery/noLeakedRender: PASS */
"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarSeparator,
} from "@decode/ui/components/sidebar";
import { cn } from "@decode/ui/lib/utils";
import { usePathname } from "next/navigation";
import { ScoutType } from "./scout-type";
import { SidebarContentSlot } from "./slot";
import { ThemeSwitcher } from "./theme";
import { Toggle } from "./toggle";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  return (
    <Sidebar
      className={cn(
        "top-(--header-height) h-[calc(100svh-var(--header-height))]!"
      )}
      pathname={pathname}
      {...props}
    >
      <SidebarHeader>
        <Toggle />
      </SidebarHeader>
      <SidebarContent>
        <SidebarContentSlot />
      </SidebarContent>
      <SidebarFooter>
        <ScoutType />
        <SidebarSeparator />
        <ThemeSwitcher />
      </SidebarFooter>
    </Sidebar>
  );
}
