/** biome-ignore-all lint/nursery/noLeakedRender: PASS */
"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@decode/ui/components/sidebar";
import { cn } from "@decode/ui/lib/utils";
import { usePathname } from "next/navigation";
import { PitSections } from "./pit-sections";
import { ScoutType } from "./scout-type";
import { SidebarContentSlot } from "./slot";
import { ThemeSwitcher } from "./theme";
import { Toggle } from "./toggle";

interface SidebarHeaderConfig {
  pattern: RegExp;
  component: React.ReactNode;
}

const SIDEBAR_HEADER_CONFIGS: SidebarHeaderConfig[] = [
  {
    pattern: /\/scout\/(ftc|frc)\/match$/,
    component: <Toggle />,
  },
  {
    pattern: /\/scout\/frc\/pit$/,
    component: <PitSections />,
  },
];

function DynamicSidebarHeader({ pathname }: { pathname: string }) {
  const matchedConfig = SIDEBAR_HEADER_CONFIGS.find((config) =>
    config.pattern.test(pathname)
  );

  if (!matchedConfig) {
    return null;
  }

  return <>{matchedConfig.component}</>;
}

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
        <DynamicSidebarHeader pathname={pathname} />
      </SidebarHeader>
      <SidebarContent>
        <SidebarContentSlot />
      </SidebarContent>
      <SidebarFooter>
        <ScoutType />
        <ThemeSwitcher />
      </SidebarFooter>
    </Sidebar>
  );
}
