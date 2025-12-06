"use client";

import { Button } from "@repo/ui/shadcn/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from "@repo/ui/shadcn/dialog";
import { FormLabel } from "@repo/ui/shadcn/form";
import Image from "next/image";
import { useRef, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import type {
  FieldEventSchema,
  FieldSchema,
  FormSchema,
} from "@/schema/scouting";

const EVENT_TYPES = [
  "autonomous_made",
  "autonomous_missed",
  "teleop_made",
  "teleop_missed",
] as const;

type EventType = (typeof EVENT_TYPES)[number];

interface PendingEvent {
  x: number;
  y: number;
}

interface FieldInputProps {
  events: FieldSchema;
  form: UseFormReturn<FormSchema>;
  onEventsChange: (events: FieldSchema) => void;
  getEventTimestamp: () => string;
}

type FieldKey =
  | "autonomousMade"
  | "autonomousMissed"
  | "teleopMade"
  | "teleopMissed";

export const EVENT_TO_FORM_KEY: Record<string, FieldKey> = {
  autonomous_made: "autonomousMade",
  autonomous_missed: "autonomousMissed",
  teleop_made: "teleopMade",
  teleop_missed: "teleopMissed",
};

export function FieldInput({
  events,
  form,
  onEventsChange,
  getEventTimestamp,
}: FieldInputProps) {
  const [PendingEvent, setPendingEvent] = useState<PendingEvent | null>(null);
  const [dialogEventType, setDialogEventType] =
    useState<EventType>("teleop_made");
  const [dialogCount, setDialogCount] = useState<number>(1);
  const imageRef = useRef<HTMLDivElement>(null);

  const ORIGINAL_IMAGE_WIDTH = 2547;
  const ORIGINAL_IMAGE_HEIGHT = 2547;

  function handleFieldClick(event: React.MouseEvent<HTMLDivElement>) {
    if (!imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    const normalizedX = (clickX / rect.width) * ORIGINAL_IMAGE_WIDTH;
    const normalizedY = (clickY / rect.height) * ORIGINAL_IMAGE_HEIGHT;

    setPendingEvent({ x: normalizedX, y: normalizedY });
    setDialogEventType("teleop_made");
    setDialogCount(1);
  }

  function handleDialogConfirm() {
    if (!PendingEvent) return;

    const newEvent: FieldEventSchema = {
      event: dialogEventType,
      coordinates: { x: PendingEvent.x, y: PendingEvent.y },
      timestamp: getEventTimestamp(),
      count: dialogCount,
    };

    const newEvents = [...events, newEvent];
    onEventsChange(newEvents);

    const formKey = EVENT_TO_FORM_KEY[dialogEventType];
    if (formKey) {
      const currentValue = (form.getValues(formKey) as number) ?? 0;
      form.setValue(formKey, currentValue + dialogCount, {
        shouldValidate: true,
      });
    }

    setPendingEvent(null);
  }

  function handleDialogCancel() {
    setPendingEvent(null);
  }

  return (
    <div className="space-y-4">
      <div
        className="relative w-full cursor-crosshair overflow-hidden rounded-lg border"
        onClick={handleFieldClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
          }
        }}
        ref={imageRef}
        role="button"
        tabIndex={0}
      >
        <Image
          alt="Field"
          className="w-full"
          height={800}
          src="/field.webp"
          width={1200}
        />
        {events.map((event, index) => {
          const leftPercent =
            (event.coordinates.x / ORIGINAL_IMAGE_WIDTH) * 100;
          const topPercent =
            (event.coordinates.y / ORIGINAL_IMAGE_HEIGHT) * 100;

          return (
            <div
              className="-translate-x-1/2 -translate-y-1/2 pointer-events-none absolute size-4 rounded-full border-2 border-red-500 bg-red-500/50"
              key={index}
              style={{
                left: `${leftPercent}%`,
                top: `${topPercent}%`,
              }}
            />
          );
        })}
      </div>

      <Dialog
        onOpenChange={(open) => !open && handleDialogCancel()}
        open={PendingEvent !== null}
      >
        <DialogContent className="w-full max-w-sm rounded-xl p-4 sm:p-5">
          <DialogTitle>Add Event</DialogTitle>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {EVENT_TYPES.map((type) => {
                  const label = type
                    .replace(/_/g, " ")
                    .replace(/\b\w/g, (l) => l.toUpperCase());
                  const isActive = dialogEventType === type;

                  return (
                    <Button
                      className="h-11 w-full justify-center rounded-xl text-sm sm:text-base"
                      key={type}
                      onClick={() => setDialogEventType(type)}
                      type="button"
                      variant={isActive ? "default" : "outline"}
                    >
                      {label}
                    </Button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2">
              <FormLabel className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                Count
              </FormLabel>
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map((amount) => {
                    const isActive = dialogCount === amount;
                    return (
                      <Button
                        className="h-11 w-full justify-center rounded-xl font-mono text-sm"
                        key={amount}
                        onClick={() => setDialogCount(amount)}
                        type="button"
                        variant={isActive ? "default" : "outline"}
                      >
                        {amount}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="mt-3 flex w-full">
            <Button
              className="w-full"
              onClick={handleDialogConfirm}
              type="button"
            >
              Add Event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
