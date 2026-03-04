"use client";

import {
  CircleAlertIcon,
  CircleCheckIcon,
  Loader2Icon,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react";
import type React from "react";
import { Button } from "@decode/ui/components/button";
import { cn } from "@decode/ui/lib/utils";

export interface ErrorToastProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  retry?: { label: string; onRetry: () => void };
  className?: string;
}

export interface WarningToastProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: { label: string; onAction: () => void };
  className?: string;
}

type Variant = "default" | "success" | "error" | "warning" | "loading";

const typography = {
  title: "wrap-break-word text-[15px] font-semibold leading-snug tracking-[-0.01em]",
  description: "wrap-break-word text-[13px] leading-[1.45] text-muted-foreground",
  action:
    "shrink-0 self-start rounded-md px-2.5 py-1.5 text-[13px] font-medium text-muted-foreground outline-none transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
} as const;

const variantBorders: Record<Variant, string> = {
  default: "border-border/50",
  success: "border-green-200/60 dark:border-green-800/40",
  error: "border-red-200/60 dark:border-red-800/40",
  warning: "border-amber-200/60 dark:border-amber-800/40",
  loading: "border-blue-200/60 dark:border-blue-800/40",
};

const baseStyles =
  "flex items-center gap-3.5 rounded-xl border bg-background/98 px-4 py-3.5 backdrop-blur-md shadow-[0_4px_24px_-4px_rgba(0,0,0,0.08),0_8px_16px_-8px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.25)] ring-1 ring-black/4 dark:ring-white/6 w-[380px] max-w-[calc(100vw-2rem)]";

function ToastContent({
  title,
  description,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
}) {
  return (
    <div className="min-w-0 flex-1 space-y-1">
      <h4 className={typography.title}>{title}</h4>
      {description && <p className={typography.description}>{description}</p>}
    </div>
  );
}

function DismissButton({
  onDismiss,
  className,
}: {
  onDismiss: () => void;
  className?: string;
}) {
  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={onDismiss}
      className={cn(
        "size-7 shrink-0 rounded-lg border-none p-0 text-muted-foreground/80 transition-colors hover:bg-muted/60 hover:text-foreground",
        className,
      )}
    >
      <XIcon className="size-3.5" strokeWidth={2} />
    </Button>
  );
}

function IconToast({
  variant,
  icon,
  title,
  description,
  action,
  onDismiss,
  className,
}: {
  variant: Variant;
  icon: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: { label: string; onClick: () => void };
  onDismiss: () => void;
  className?: string;
}) {
  return (
    <div className={cn(baseStyles, variantBorders[variant], className)}>
      <div className="shrink-0">{icon}</div>
      <div className={action ? "flex min-w-0 flex-1 flex-col gap-2" : "min-w-0 flex-1"}>
        <ToastContent title={title} description={description} />
        {action && (
          <button
            type="button"
            onClick={() => {
              action.onClick();
              onDismiss();
            }}
            className={typography.action}
          >
            {action.label}
          </button>
        )}
      </div>
      <DismissButton onDismiss={onDismiss} />
    </div>
  );
}

export function SuccessToast({
  title,
  description,
  className,
  onDismiss,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
  onDismiss: () => void;
}) {
  return (
    <IconToast
      variant="success"
      icon={
        <CircleCheckIcon
          className="size-5 text-green-600 dark:text-green-400"
          strokeWidth={2}
        />
      }
      title={title}
      description={description}
      onDismiss={onDismiss}
      className={className}
    />
  );
}

export function ErrorToast({
  title,
  description,
  retry,
  className,
  onDismiss,
}: ErrorToastProps & { onDismiss: () => void }) {
  return (
    <IconToast
      variant="error"
      icon={
        <CircleAlertIcon
          className="size-5 text-red-600 dark:text-red-400"
          strokeWidth={2}
        />
      }
      title={title}
      description={description}
      action={retry ? { label: retry.label, onClick: retry.onRetry } : undefined}
      onDismiss={onDismiss}
      className={className}
    />
  );
}

export function WarningToast({
  title,
  description,
  action,
  className,
  onDismiss,
}: WarningToastProps & { onDismiss: () => void }) {
  return (
    <IconToast
      variant="warning"
      icon={
        <TriangleAlertIcon
          className="size-5 text-amber-600 dark:text-amber-400"
          strokeWidth={2}
        />
      }
      title={title}
      description={description}
      action={action ? { label: action.label, onClick: action.onAction } : undefined}
      onDismiss={onDismiss}
      className={className}
    />
  );
}

export function LoadingToast({
  title,
  className,
  onDismiss,
}: {
  title: React.ReactNode;
  className?: string;
  onDismiss: () => void;
}) {
  return (
    <div className={cn(baseStyles, variantBorders.loading, className)}>
      <div className="shrink-0">
        <Loader2Icon
          className="size-5 animate-spin text-muted-foreground"
          strokeWidth={2}
        />
      </div>
      <ToastContent title={title} />
      <DismissButton onDismiss={onDismiss} />
    </div>
  );
}
