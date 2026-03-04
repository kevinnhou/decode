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

function resolve(v: React.ReactNode | (() => React.ReactNode) | undefined) {
  return typeof v === "function" ? (v as () => React.ReactNode)() : v;
}

function isAction(v: unknown): v is Action {
  return typeof v === "object" && v !== null && "label" in v && "onClick" in v;
}

function toOpts(d?: ExternalToast) {
  if (!d) return d;
  const { description: _, action: __, ...rest } = d;
  return rest;
}

function custom(
  render: (id: number | string) => React.ReactElement,
  data?: ExternalToast,
) {
  return sonnerToast.custom(render, toOpts(data));
}

function successToast(message: React.ReactNode, data?: ExternalToast) {
  return custom(
    (id) => (
      <SuccessToast
        title={resolve(message)}
        description={resolve(data?.description)}
        onDismiss={() => sonnerToast.dismiss(id)}
      />
    ),
    data,
  );
}

const toast = Object.assign(successToast, {
  success: successToast,
  info: successToast,
  message: successToast,
  error: (message: React.ReactNode, data?: ExternalToast) => {
    const action = data?.action;
    const retry = isAction(action)
      ? { label: String(action.label), onRetry: () => action.onClick({} as React.MouseEvent<HTMLButtonElement, MouseEvent>) }
      : undefined;
    return custom(
      (id) => (
        <ErrorToast
          title={resolve(message)}
          description={resolve(data?.description)}
          retry={retry}
          onDismiss={() => sonnerToast.dismiss(id)}
        />
      ),
      data,
    );
  },
  warning: (message: React.ReactNode, data?: ExternalToast) => {
    const action = data?.action;
    const act = isAction(action)
      ? { label: String(action.label), onAction: () => action.onClick({} as React.MouseEvent<HTMLButtonElement, MouseEvent>) }
      : undefined;
    return custom(
      (id) => (
        <WarningToast
          title={resolve(message)}
          description={resolve(data?.description)}
          action={act}
          onDismiss={() => sonnerToast.dismiss(id)}
        />
      ),
      data,
    );
  },
  loading: (message: React.ReactNode, data?: ExternalToast) =>
    sonnerToast.custom(
      (id) => (
        <LoadingToast
          title={resolve(message)}
          onDismiss={() => sonnerToast.dismiss(id)}
        />
      ),
      data,
    ),
  promise: <T,>(
    promise: Promise<T> | (() => Promise<T>),
    data: {
      loading?: React.ReactNode;
      success?: React.ReactNode | ((data: T) => React.ReactNode);
      error?: React.ReactNode | ((error: unknown) => React.ReactNode);
      finally?: () => void;
    },
  ) => {
    const loadingMsg = data?.loading ?? "Loading...";
    const successMsg = data?.success ?? "Success";
    const errorMsg = data?.error ?? "An error occurred";

    const id = sonnerToast.custom(
      (toastId) => (
        <LoadingToast
          title={resolve(loadingMsg)}
          onDismiss={() => sonnerToast.dismiss(toastId)}
        />
      ),
      { duration: Number.POSITIVE_INFINITY },
    );

    const p = Promise.resolve(
      typeof promise === "function" ? (promise as () => Promise<T>)() : promise,
    );

    p.then(async (result) => {
      const msg = typeof successMsg === "function" ? await successMsg(result) : successMsg;
      sonnerToast.custom(
        (toastId) => (
          <SuccessToast
            title={resolve(msg)}
            onDismiss={() => sonnerToast.dismiss(toastId)}
          />
        ),
        { id, duration: 4000 },
      );
    }).catch(async (err) => {
      const msg = typeof errorMsg === "function" ? await errorMsg(err) : errorMsg;
      sonnerToast.custom(
        (toastId) => (
          <ErrorToast
            title={resolve(msg)}
            onDismiss={() => sonnerToast.dismiss(toastId)}
          />
        ),
        { id, duration: 4000 },
      );
    }).finally(() => {
      data?.finally?.();
    });

    return Object.assign(p, {
      unwrap: () => p,
    });
  },
  dismiss: sonnerToast.dismiss.bind(sonnerToast),
  getHistory: sonnerToast.getHistory?.bind(sonnerToast) ?? (() => []),
  getToasts: sonnerToast.getToasts?.bind(sonnerToast) ?? (() => []),
});

function Toaster({
  theme = "system",
  ...props
}: React.ComponentProps<typeof Sonner>) {
  return (
    <Sonner
      className="toaster group"
      theme={theme as "light" | "dark" | "system"}
      toastOptions={{ unstyled: true }}
      {...props}
    />
  );
}

export type { ExternalToast } from "sonner";
export { toast, Toaster };
