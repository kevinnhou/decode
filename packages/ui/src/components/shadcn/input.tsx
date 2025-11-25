import { cn } from "@repo/ui/lib/utils";
import type * as React from "react";

function Input({ className, type, onWheel, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "flex h-9 w-full min-w-0 rounded-xl border border-ring bg-transparent px-3 py-1 text-base shadow-xs outline-none transition-[color,box-shadow,border-color] duration-300 selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:font-medium file:text-foreground file:text-sm placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30",
        "[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]",
        "placeholder:tracking-wider",
        "focus-visible:border-primary",
        "aria-invalid:border-destructive",
        className
      )}
      data-slot="input"
      type={type}
      onWheel={(e) => {
        if (type === "number" && document.activeElement === e.currentTarget) {
          e.currentTarget.blur();
        }
        onWheel?.(e);
      }}
      {...props}
    />
  );
}

export { Input };
