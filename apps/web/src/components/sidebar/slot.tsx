"use client";

import { type ReactNode, useEffect, useState } from "react";

function createSlot() {
  let current: ReactNode = null;
  const subscribers = new Set<(content: ReactNode) => void>();

  function set(content: ReactNode) {
    current = content;
    for (const subscriber of subscribers) {
      subscriber(content);
    }
  }

  function Slot({ fallback }: { fallback?: ReactNode } = {}) {
    const [content, setContent] = useState<ReactNode>(current);

    useEffect(() => {
      const handler = (newContent: ReactNode) => {
        setContent(newContent);
      };
      subscribers.add(handler);
      if (current !== null) {
        setContent(current);
      }
      return () => {
        subscribers.delete(handler);
      };
    }, []);

    return <>{content ?? fallback}</>;
  }

  return { set, Slot };
}

const contentSlot = createSlot();
export const setSidebarContent = contentSlot.set;
export const SidebarContentSlot = contentSlot.Slot;

const footerSlot = createSlot();
export const setSidebarFooterContent = footerSlot.set;
export const SidebarFooterSlot = footerSlot.Slot;
