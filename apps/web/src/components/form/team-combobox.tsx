"use client";

import { Button } from "@decode/ui/components/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@decode/ui/components/command";
import { Input } from "@decode/ui/components/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@decode/ui/components/popover";
import { cn } from "@decode/ui/lib/utils";
import { ArrowLeft, ChevronsUpDown, Pencil } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

interface TeamComboboxProps {
  value: number | undefined;
  onChange: (teamNumber: number, teamName: string) => void;
  teamsMap: Record<string, string>;
  scoutedCounts?: Record<string, number>;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function TeamCombobox({
  value,
  onChange,
  teamsMap,
  scoutedCounts,
  disabled = false,
  placeholder = "Select a team...",
  className,
}: TeamComboboxProps) {
  const [open, setOpen] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [customInput, setCustomInput] = useState("");

  const teams = useMemo(
    () =>
      Object.entries(teamsMap)
        .map(([number, name]) => ({ number, name }))
        .sort((a, b) => Number(a.number) - Number(b.number)),
    [teamsMap]
  );

  const currentLabel = useMemo(() => {
    if (!value) {
      return null;
    }
    const name = teamsMap[String(value)];
    return name ? `#${value} / ${name}` : `#${value}`;
  }, [value, teamsMap]);

  const handleSelect = useCallback(
    (teamNumber: string) => {
      const name = teamsMap[teamNumber] ?? "";
      onChange(Number(teamNumber), name);
      setOpen(false);
    },
    [teamsMap, onChange]
  );

  const handleCustomConfirm = useCallback(() => {
    const num = Number.parseInt(customInput, 10);
    if (!Number.isNaN(num) && num > 0) {
      const name = teamsMap[String(num)] ?? "";
      onChange(num, name);
      setCustomMode(false);
      setCustomInput("");
    }
  }, [customInput, teamsMap, onChange]);

  if (customMode) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Button
          className="size-9 shrink-0"
          onClick={() => {
            setCustomMode(false);
            setCustomInput("");
          }}
          size="icon"
          title="Back to team list"
          type="button"
          variant="outline"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <Input
          autoFocus
          className="flex-1"
          inputMode="numeric"
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleCustomConfirm();
            }
          }}
          placeholder="Enter any team number"
          type="number"
          value={customInput}
        />
        <Button
          className="shrink-0"
          disabled={
            !customInput ||
            Number.isNaN(Number.parseInt(customInput, 10)) ||
            Number.parseInt(customInput, 10) <= 0
          }
          onClick={handleCustomConfirm}
          type="button"
        >
          Confirm
        </Button>
      </div>
    );
  }

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <button
          aria-expanded={open}
          className={cn(
            "flex h-9 w-full min-w-0 items-center rounded-xl border border-ring bg-transparent px-3 pt-px text-base shadow-xs outline-none transition-[color,box-shadow,border-color] duration-300 dark:bg-input/30",
            "focus-visible:border-primary",
            "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
            "md:text-sm",
            !currentLabel && "text-muted-foreground placeholder:tracking-wider",
            className
          )}
          disabled={disabled}
          role="combobox"
          type="button"
        >
          <span className="flex-1 truncate text-left">
            {currentLabel ?? placeholder}
          </span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-(--radix-popover-trigger-width) p-0"
      >
        <Command>
          <CommandInput placeholder="Search by number or name..." />
          <CommandList>
            <CommandEmpty>No teams found.</CommandEmpty>
            <CommandGroup>
              {teams.map(({ number, name }) => {
                const count = scoutedCounts?.[number];
                return (
                  <CommandItem
                    key={number}
                    onSelect={() => handleSelect(number)}
                    value={`${number} ${name}`}
                  >
                    <span className="font-medium font-mono">#{number}</span>
                    <span className="ml-2 flex-1 truncate text-muted-foreground">
                      {name}
                    </span>
                    {scoutedCounts !== undefined && (
                      <ScoutedBadge count={count} />
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>

            {teams.length > 0 && <CommandSeparator />}

            <CommandGroup>
              <CommandItem
                className="text-muted-foreground"
                onSelect={() => {
                  setOpen(false);
                  setCustomMode(true);
                }}
                value="__custom__"
              >
                <Pencil className="size-3.5" />
                <span className="text-xs italic">
                  ENTER A DIFFERENT TEAM NUMBER
                </span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function ScoutedBadge({ count }: { count: number | undefined }) {
  if (!count) {
    return (
      <span className="ml-2 shrink-0 rounded-full px-1.5 py-0.5 text-[10px] text-muted-foreground/40">
        —
      </span>
    );
  }
  return (
    <span className="ml-2 shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary">
      {count}×
    </span>
  );
}
