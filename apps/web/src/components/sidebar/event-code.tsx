"use client";

import { Input } from "@decode/ui/components/input";
import { useSidebar } from "@decode/ui/components/sidebar";
import { cn } from "@decode/ui/lib/utils";
import { Hash } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useConfigRevision } from "@/hooks/use-config-revision";
import { getConfig, setConfig } from "@/lib/config";
import type { SpreadsheetConfigSchema } from "@/schema/scouting";

const MIN_EVENT_CODE_LENGTH = 3;
const SAVE_DEBOUNCE_MS = 450;

function persistEventCode(raw: string) {
  const code = raw.trim().toUpperCase();
  if (code.length < MIN_EVENT_CODE_LENGTH) {
    return;
  }
  const prev = getConfig();
  const next: SpreadsheetConfigSchema = {
    eventCode: code,
    spreadsheetId: prev?.spreadsheetId ?? "",
    sheetId: prev?.sheetId ?? "",
  };
  setConfig(next);
}

export function SidebarEventCode() {
  const pathname = usePathname();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  useConfigRevision();
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onScout = pathname.startsWith("/scout");
  const hasEventCode = Boolean(getConfig()?.eventCode?.trim());

  const clearDebounce = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }, []);

  const scheduleSave = useCallback(
    (value: string) => {
      clearDebounce();
      const trimmed = value.trim();
      if (trimmed.length < MIN_EVENT_CODE_LENGTH) {
        return;
      }
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        persistEventCode(value);
      }, SAVE_DEBOUNCE_MS);
    },
    [clearDebounce]
  );

  useEffect(() => () => clearDebounce(), [clearDebounce]);

  useEffect(() => {
    if (!onScout) {
      setExpanded(false);
      setDraft("");
    }
  }, [onScout]);

  if (!onScout || hasEventCode) {
    return null;
  }

  return (
    <div
      className={cn(
        "shrink-0 px-1.5 pt-0.5 pb-1.5",
        "group-data-[collapsible=icon]:px-1"
      )}
    >
      {expanded ? (
        <div
          className={cn(
            "fade-in zoom-in-95 origin-top animate-in",
            "duration-200 ease-out"
          )}
          key="expanded"
        >
          <Input
            aria-label="Event code"
            autoCapitalize="characters"
            autoComplete="off"
            autoCorrect="off"
            autoFocus
            className={cn(
              "h-8 rounded-none border-sidebar-border/20 border-x-0 border-t-0 border-b bg-transparent px-1 font-mono text-xs shadow-none",
              "transition-[border-color,background-color,color] duration-200 ease-out",
              "placeholder:text-sidebar-foreground/25",
              "hover:border-sidebar-border/30",
              "focus-visible:border-sidebar-border/45 focus-visible:bg-sidebar-accent/10 focus-visible:ring-0"
            )}
            onBlur={() => {
              clearDebounce();
              persistEventCode(draft);
            }}
            onChange={(e) => {
              const v = e.target.value.toUpperCase();
              setDraft(v);
              scheduleSave(v);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                clearDebounce();
                persistEventCode(draft);
              }
            }}
            placeholder="AUSC"
            spellCheck={false}
            value={draft}
          />
        </div>
      ) : (
        <button
          className={cn(
            "group flex w-full items-center rounded-md text-left transition-[color,background-color] duration-200 ease-out",
            "text-[11px] text-sidebar-foreground/40 tracking-wide",
            "hover:bg-sidebar-accent/25 hover:text-sidebar-foreground/65",
            "focus-visible:bg-sidebar-accent/25 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sidebar-ring/25",
            isCollapsed ? "justify-center px-1 py-1.5" : "gap-2 px-1.5 py-1.5"
          )}
          onClick={() => setExpanded(true)}
          title="Set event code"
          type="button"
        >
          {isCollapsed ? (
            <Hash
              aria-hidden
              className="size-[15px] opacity-50 transition-opacity duration-200 ease-out group-hover:opacity-70"
              strokeWidth={1.5}
            />
          ) : (
            <span className="w-full truncate font-bold text-destructive italic">
              {">"} EVENT CODE Missing
            </span>
          )}
        </button>
      )}
    </div>
  );
}
