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

export interface ActionToastProps {
  title: string;
  description?: string;
  actionLabel: string;
  onAction: () => void;
  cancelLabel?: string;
  onCancel?: () => void;
  className?: string;
}

export interface ErrorToastProps {
  title: string;
  description?: string;
  retry?: { label: string; onRetry: () => void };
  className?: string;
}

export interface WarningToastProps {
  title: string;
  description?: string;
  action?: { label: string; onAction: () => void };
  className?: string;
}

interface BaseProps {
  title: string;
  description?: string;
  onDismiss: () => void;
}

function ToastWrapper({
  children,
  className,
  variant = "default",
}: {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "success" | "error" | "warning" | "loading";
}) {
  const variantStyles = {
    default: "border-border/50",
    success: "border-green-200/60 dark:border-green-800/40",
    error: "border-red-200/60 dark:border-red-800/40",
    warning: "border-amber-200/60 dark:border-amber-800/40",
    loading: "border-blue-200/60 dark:border-blue-800/40",
  };

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border bg-background/95 p-4 backdrop-blur-sm",
        "shadow-black/5 shadow-lg dark:shadow-black/20",
        "ring-1 ring-black/5 dark:ring-white/5",
        "w-[400px] max-w-[90vw]",
        variantStyles[variant],
        className,
      )}
    >
      {children}
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
        "size-6 border-none p-0 text-muted-foreground hover:text-foreground",
        "transition-colors hover:bg-muted/50",
        className,
      )}
    >
      <XIcon className="size-3" />
    </Button>
  );
}

export function ActionToast({
  title,
  description,
  actionLabel,
  onAction,
  cancelLabel = "Cancel",
  onCancel,
  className,
  onDismiss,
}: ActionToastProps & { onDismiss: () => void }) {
  return (
    <ToastWrapper variant="default" className={className}>
      <div className="min-w-0 flex-1 space-y-3">
        <div className="space-y-1">
          <h4 className="wrap-break-word font-medium text-sm leading-none">
            {title}
          </h4>
          {description && (
            <p className="wrap-break-word text-muted-foreground text-sm leading-relaxed">
              {description}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => {
              onAction();
              onDismiss();
            }}
            className="h-7 shrink-0 px-3 text-xs"
          >
            {actionLabel}
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              onCancel?.();
              onDismiss();
            }}
            className="h-7 shrink-0 px-3 text-muted-foreground text-xs hover:text-foreground"
          >
            {cancelLabel}
          </Button>
        </div>
      </div>
    </ToastWrapper>
  );
}

export function SuccessToast({
  title,
  description,
  className,
  onDismiss,
}: BaseProps & { className?: string }) {
  return (
    <ToastWrapper variant="success" className={className}>
      <div className="mt-0.5 shrink-0">
        <CircleCheckIcon className="size-4 text-green-600 dark:text-green-400" />
      </div>

      <div className="min-w-0 flex-1">
        <h4 className="wrap-break-word font-medium text-sm leading-none">
          {title}
        </h4>
        {description && (
          <p className="mt-1 wrap-break-word text-muted-foreground text-sm leading-relaxed">
            {description}
          </p>
        )}
      </div>

      <DismissButton onDismiss={onDismiss} />
    </ToastWrapper>
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
    <ToastWrapper variant="error" className={className}>
      <div className="mt-0.5 shrink-0">
        <CircleAlertIcon className="size-4 text-red-600 dark:text-red-400" />
      </div>

      <div className="min-w-0 flex-1 space-y-3">
        <div className="space-y-1">
          <h4 className="wrap-break-word font-medium text-sm leading-none">
            {title}
          </h4>
          {description && (
            <p className="wrap-break-word text-muted-foreground text-sm leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {retry && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              retry.onRetry();
              onDismiss();
            }}
            className="h-7 shrink-0 px-3 text-muted-foreground text-xs hover:text-foreground"
          >
            {retry.label}
          </Button>
        )}
      </div>

      <DismissButton onDismiss={onDismiss} />
    </ToastWrapper>
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
    <ToastWrapper variant="warning" className={className}>
      <div className="mt-0.5 shrink-0">
        <TriangleAlertIcon className="size-4 text-amber-600 dark:text-amber-400" />
      </div>

      <div className="min-w-0 flex-1 space-y-3">
        <div className="space-y-1">
          <h4 className="wrap-break-word font-medium text-sm leading-none">
            {title}
          </h4>
          {description && (
            <p className="wrap-break-word text-muted-foreground text-sm leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {action && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              action.onAction();
              onDismiss();
            }}
            className="h-7 shrink-0 px-3 text-muted-foreground text-xs hover:text-foreground"
          >
            {action.label}
          </Button>
        )}
      </div>

      <DismissButton onDismiss={onDismiss} />
    </ToastWrapper>
  );
}

export function LoadingToast({
  title,
  className,
  onDismiss,
}: Omit<BaseProps, "description"> & { className?: string }) {
  return (
    <ToastWrapper variant="loading" className={className}>
      <div className="mt-0.5 shrink-0">
        <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
      </div>

      <div className="min-w-0 flex-1">
        <h4 className="wrap-break-word font-medium text-sm leading-none">
          {title}
        </h4>
      </div>

      <DismissButton onDismiss={onDismiss} />
    </ToastWrapper>
  );
}

export function PromiseLoadingToast({
  title,
  className,
  onDismiss,
}: Omit<BaseProps, "description"> & { className?: string }) {
  return (
    <ToastWrapper variant="loading" className={className}>
      <div className="mt-0.5 shrink-0">
        <Loader2Icon className="size-4 animate-spin text-blue-600 dark:text-blue-400" />
      </div>

      <div className="min-w-0 flex-1">
        <h4 className="wrap-break-word font-medium text-blue-900 text-sm leading-none dark:text-blue-100">
          {title}
        </h4>
        <p className="mt-1 text-blue-700/80 text-xs dark:text-blue-300/80">
          Please wait...
        </p>
      </div>

      <DismissButton
        onDismiss={onDismiss}
        className="text-blue-600/60 hover:text-blue-600 dark:text-blue-400/60 dark:hover:text-blue-400"
      />
    </ToastWrapper>
  );
}

export function PromiseSuccessToast({
  title,
  className,
  onDismiss,
}: BaseProps & { className?: string }) {
  return (
    <ToastWrapper variant="success" className={className}>
      <div className="mt-0.5 shrink-0">
        <CircleCheckIcon className="size-4 text-green-600 dark:text-green-400" />
      </div>

      <div className="min-w-0 flex-1">
        <h4 className="wrap-break-word font-medium text-green-900 text-sm leading-none dark:text-green-100">
          {title}
        </h4>
        <p className="mt-1 text-green-700/80 text-xs dark:text-green-300/80">
          Success
        </p>
      </div>

      <DismissButton
        onDismiss={onDismiss}
        className="text-green-600/60 hover:text-green-600 dark:text-green-400/60 dark:hover:text-green-400"
      />
    </ToastWrapper>
  );
}

export function PromiseErrorToast({
  title,
  className,
  onDismiss,
}: BaseProps & { className?: string }) {
  return (
    <ToastWrapper variant="error" className={className}>
      <div className="mt-0.5 shrink-0">
        <CircleAlertIcon className="size-4 text-red-600 dark:text-red-400" />
      </div>

      <div className="min-w-0 flex-1">
        <h4 className="wrap-break-word font-medium text-red-900 text-sm leading-none dark:text-red-100">
          {title}
        </h4>
        <p className="mt-1 text-red-700/80 text-xs dark:text-red-300/80">
          An error occurred
        </p>
      </div>

      <DismissButton
        onDismiss={onDismiss}
        className="text-red-600/60 hover:text-red-600 dark:text-red-400/60 dark:hover:text-red-400"
      />
    </ToastWrapper>
  );
}
