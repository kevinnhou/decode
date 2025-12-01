"use client";

import { baseColours } from "@repo/ui/lib/colours";
import { cn } from "@repo/ui/lib/utils";
import { Button } from "@repo/ui/shadcn/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui/shadcn/dropdown-menu";
import { useThemeConfig } from "@repo/ui/shadcn/providers";
import { useSidebar } from "@repo/ui/shadcn/sidebar";
import { CheckIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeSwitcher() {
  const { activeTheme, setActiveTheme } = useThemeConfig();
  const { setTheme, resolvedTheme: theme } = useTheme();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <div className="p-2">
      <div className="flex flex-col gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              className={cn(
                "flex w-full items-center gap-2",
                isCollapsed ? "justify-center px-2" : "justify-start px-3"
              )}
              size="sm"
              variant="outline"
            >
              <span
                className="size-3 rounded-full"
                style={{
                  backgroundColor:
                    baseColours.find((c) => c.name === activeTheme)
                      ?.activeColour[theme === "dark" ? "dark" : "light"] || "",
                }}
              />
              {!isCollapsed && (
                <span className="truncate">
                  {baseColours.find((c) => c.name === activeTheme)?.label}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top">
            {baseColours.map((colour) => (
              <DropdownMenuItem
                className="flex items-center gap-2"
                key={colour.name}
                onClick={() => setActiveTheme(colour.name)}
              >
                <span
                  className="size-4 rounded-full"
                  style={{
                    backgroundColor:
                      colour.activeColour[theme === "dark" ? "dark" : "light"],
                  }}
                />
                <span>{colour.label}</span>
                {activeTheme === colour.name && (
                  <CheckIcon className="ml-auto size-4" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          className={cn(
            "flex w-full items-center gap-2",
            isCollapsed ? "justify-center px-2" : "justify-start px-3"
          )}
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          size="sm"
          variant="outline"
        >
          {theme === "dark" ? (
            <>
              <MoonIcon className="size-4" />
              {!isCollapsed && <span>Dark</span>}
            </>
          ) : (
            <>
              <SunIcon className="size-4" />
              {!isCollapsed && <span>Light</span>}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
