"use client";

import { cn } from "@repo/ui/lib/utils";
import { Button } from "@repo/ui/shadcn/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@repo/ui/shadcn/form";
import { Input } from "@repo/ui/shadcn/input";
import { Plus } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { useFormContext } from "react-hook-form";

interface IntegerInputProps {
  name: string;
  label: string;
  incrementKey?: string;
  className?: string;
}

export function IntegerInput({
  name,
  label,
  incrementKey,
  className,
}: IntegerInputProps) {
  const form = useFormContext();
  const inputRef = useRef<HTMLInputElement>(null);

  const increment = useCallback(() => {
    const currentValue = Number.parseInt(form.getValues(name) || "0", 10);
    const newValue = currentValue + 1;
    form.setValue(name, newValue, { shouldValidate: true });

    // must blur any focused input to prevent blocking subsequent keybinds
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, [form, name]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const activeElement = document.activeElement;

      if (
        (activeElement instanceof HTMLInputElement ||
          activeElement instanceof HTMLTextAreaElement) &&
        activeElement !== inputRef.current
      ) {
        return;
      }

      if (
        incrementKey &&
        event.key.toLowerCase() === incrementKey.toLowerCase() &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        !event.shiftKey
      ) {
        event.preventDefault();
        increment();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [incrementKey, increment]);

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>
            {label}{" "}
            <span className="font-sans text-muted-foreground capitalize tracking-widest">
              [{incrementKey}]
            </span>
          </FormLabel>
          <FormControl>
            <div className="flex items-center gap-2">
              <Input
                {...field}
                className={cn("w-full text-center")}
                inputMode="numeric"
                onChange={(e) => {
                  const val =
                    e.target.value === ""
                      ? 0
                      : Number.parseInt(e.target.value, 10);
                  if (Number.isNaN(val)) {
                    return;
                  }
                  field.onChange(val);
                }}
                ref={inputRef}
                type="number"
                value={field.value ?? 0}
              />
              <Button
                className="size-9 shrink-0 rounded border border-ring bg-transparent text-foreground hover:bg-transparent"
                onClick={increment}
                size="icon"
                type="button"
              >
                <Plus className="size-4" />
              </Button>
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
