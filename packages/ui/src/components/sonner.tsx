"use client";

import type React from "react";
import {
  ErrorToast,
  LoadingToast,
  SuccessToast,
  WarningToast,
} from "@decode/ui/components/toast-templates";
import { Toaster as Sonner, toast as sonnerToast } from "sonner";
import type { Action, ExternalToast } from "sonner";

function isAction(value: unknown): value is Action {
  return (
    typeof value === "object" &&
    value !== null &&
    "label" in value &&
    "onClick" in value &&
    typeof (value as Action).onClick === "function"
  );
}

function resolveReactNode(
  value: React.ReactNode | (() => React.ReactNode) | undefined,
): React.ReactNode {
  if (value === undefined) return undefined;
  if (typeof value === "function") return (value as () => React.ReactNode)();
  return value;
}

function createCustomToast() {
  const customToast = (
    message: React.ReactNode,
    data?: ExternalToast,
  ): string | number => {
    const title = resolveReactNode(message);
    const description = resolveReactNode(data?.description);
    return sonnerToast.custom(
      (id) => (
        <SuccessToast
          title={title}
          description={description}
          onDismiss={() => sonnerToast.dismiss(id)}
        />
      ),
      data,
    );
  };

  customToast.success = (
    message: React.ReactNode,
    data?: ExternalToast,
  ): string | number => {
    const title = resolveReactNode(message);
    const description = resolveReactNode(data?.description);

    return sonnerToast.custom(
      (id) => (
        <SuccessToast
          title={title}
          description={description}
          onDismiss={() => sonnerToast.dismiss(id)}
        />
      ),
      data,
    );
  };

  customToast.error = (
    message: React.ReactNode,
    data?: ExternalToast,
  ): string | number => {
    const title = resolveReactNode(message);
    const description = resolveReactNode(data?.description);

    const actionData = data?.action;
    const retry = isAction(actionData)
      ? {
          label: String(actionData.label),
          onRetry: () =>
            actionData.onClick(
              {} as React.MouseEvent<HTMLButtonElement, MouseEvent>,
            ),
        }
      : undefined;

    return sonnerToast.custom(
      (id) => (
        <ErrorToast
          title={title}
          description={description}
          retry={retry}
          onDismiss={() => sonnerToast.dismiss(id)}
        />
      ),
      data,
    );
  };

  customToast.warning = (
    message: React.ReactNode,
    data?: ExternalToast,
  ): string | number => {
    const title = resolveReactNode(message);
    const description = resolveReactNode(data?.description);

    const actionData = data?.action;
    const action = isAction(actionData)
      ? {
          label: String(actionData.label),
          onAction: () =>
            actionData.onClick(
              {} as React.MouseEvent<HTMLButtonElement, MouseEvent>,
            ),
        }
      : undefined;

    return sonnerToast.custom(
      (id) => (
        <WarningToast
          title={title}
          description={description}
          action={action}
          onDismiss={() => sonnerToast.dismiss(id)}
        />
      ),
      data,
    );
  };

  customToast.loading = (
    message: React.ReactNode,
    data?: ExternalToast,
  ): string | number => {
    const title = resolveReactNode(message);

    return sonnerToast.custom(
      (id) => (
        <LoadingToast
          title={title}
          onDismiss={() => sonnerToast.dismiss(id)}
        />
      ),
      data,
    );
  };

  customToast.info = customToast.success;

  customToast.message = customToast;

  customToast.promise = ((promise, data) =>
    sonnerToast.promise(promise, data)) as <T>(
    promise: Promise<T> | (() => Promise<T>),
    data?: Parameters<typeof sonnerToast.promise>[1],
  ) => { unwrap: () => Promise<T> };

  customToast.dismiss = sonnerToast.dismiss.bind(sonnerToast);

  customToast.getHistory =
    sonnerToast.getHistory?.bind(sonnerToast) ?? (() => []);

  customToast.getToasts = sonnerToast.getToasts?.bind(sonnerToast) ?? (() => []);

  return customToast;
}

const toast = createCustomToast();

function Toaster({
  theme = "system",
  ...props
}: React.ComponentProps<typeof Sonner>) {
  return (
    <Sonner
      className="toaster group"
      theme={theme as "light" | "dark" | "system"}
      toastOptions={{
        unstyled: true,
      }}
      {...props}
    />
  );
}

export type { ExternalToast } from "sonner";
export { toast };
export { Toaster };
