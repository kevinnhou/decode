"use client";

import { Button } from "@decode/ui/components/button";
import type { FieldSchema, FrcFieldEvent } from "@/schema/scouting";

interface EventsListProps {
  events: FieldSchema;
  onRemoveEvent: (index: number) => void;
}

interface FrcEventsListProps {
  events: FrcFieldEvent[];
  onRemoveEvent: (index: number) => void;
}

function formatFrcEventLabel(ev: FrcFieldEvent): string {
  const type = ev.eventType.charAt(0).toUpperCase() + ev.eventType.slice(1);
  const extras: string[] = [];
  if (ev.action) {
    extras.push(ev.action);
  }
  if (ev.source) {
    extras.push(ev.source);
  }
  if (ev.climbLevel) {
    extras.push(`L${ev.climbLevel}`);
  }
  const suffix = extras.length ? ` (${extras.join(", ")})` : "";
  return `${type}${suffix} · ${ev.startTimestamp}–${ev.endTimestamp}`;
}

export function EventsList({ events, onRemoveEvent }: EventsListProps) {
  return (
    <div className="flex h-full flex-col space-y-2">
      <div className="flex shrink-0 items-center justify-between">
        {events.length > 0 && (
          <span className="font-medium text-muted-foreground text-xs">
            {events.length} {events.length === 1 ? "Event" : "Events"}
          </span>
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
                key={event.event}
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

export function FrcEventsList({ events, onRemoveEvent }: FrcEventsListProps) {
  return (
    <div className="flex h-full flex-col space-y-2">
      <div className="flex shrink-0 items-center justify-between">
        {events.length > 0 && (
          <span className="font-medium text-muted-foreground text-xs">
            {events.length} {events.length === 1 ? "Event" : "Events"}
          </span>
        )}
      </div>
      {events.length > 0 && (
        <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto rounded-md border-l bg-muted/30 p-1.5">
          {events.map((event, index) => (
            <div
              className="group flex items-center justify-between gap-2 rounded px-2 py-1.5 text-xs transition-colors"
              key={`${index}-${event.startTimestamp}`}
            >
              <div className="rounded bg-primary/10 px-1.5 py-0.5 font-medium text-primary">
                {formatFrcEventLabel(event)}
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
          ))}
        </div>
      )}
    </div>
  );
}
