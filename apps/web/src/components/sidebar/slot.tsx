"use client";

import { useEffect, useState, type ReactNode } from "react";

let currentContent: ReactNode = null;
const subscribers = new Set<(content: ReactNode) => void>();

export function setSidebarContent(content: ReactNode) {
  currentContent = content;
  subscribers.forEach((subscriber) => subscriber(content));
}

export function SidebarContentSlot() {
  const [content, setContent] = useState<ReactNode>(currentContent);

  useEffect(() => {
    const handler = (newContent: ReactNode) => {
      setContent(newContent);
    };
    subscribers.add(handler);
    if (currentContent !== null) {
      setContent(currentContent);
    }
    return () => {
      subscribers.delete(handler);
    };
  }, []);

  return <>{content}</>;
}
