"use client";

import { Button } from "@repo/ui/shadcn/button";
import type { FieldSchema } from "@/schema/scouting";

interface EventsListProps {
  events: FieldSchema;
  onRemoveEvent: (index: number) => void;
}

export function EventsList({
  events,
  onRemoveEvent,
}: EventsListProps) {
  return (
    <div className="flex h-full flex-col space-y-2">
      <div className="shrink-0 flex items-center justify-between">
        {events.length > 0 && (
          <>
            <span className="font-medium text-muted-foreground text-xs">
              {events.length} {events.length === 1 ? "Event" : "Events"}
            </span>
          </>
        )}
      </div>
      {events.length > 0 && (
        <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto rounded-md border-l bg-muted/30 p-1.5">
          {events.map((event, index) => {
            const eventLabel = event.event
              .replace(/_/g, " ")
              .replace(/\b\w/g, (l) => l.toUpperCase());
            return (
              <div
                className="group flex items-center justify-between gap-2 rounded px-2 py-1.5 text-xs transition-colors"
                key={index}
              >
                <div className="rounded bg-primary/10 px-1.5 py-0.5 font-medium text-primary">
                  {eventLabel}
                  {event.count > 1 && (
                    <span className="text-muted-foreground">
                      {" "}
                      \ {event.count}
                    </span>
                  )}
                </div>
                <Button
                  className="size-5 rounded p-0 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={() => onRemoveEvent(index)}
                  type="button"
                  variant="ghost"
                >
                  ×
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
