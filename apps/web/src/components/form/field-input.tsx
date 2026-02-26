"use client";

import { Button } from "@decode/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from "@decode/ui/components/dialog";
import { FormLabel } from "@decode/ui/components/form";
import type { UseFormReturn } from "@decode/ui/lib/react-hook-form";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PAUSE_TIME_SECONDS, type TimerState } from "@/hooks/use-match-timer";
import type {
  FieldEventSchema,
  FieldSchema,
  FormSchema,
  FrcAutoPath,
  FrcAutoPathPoint,
  FrcFieldEvent,
  FrcFieldEventType,
  FrcPeriod,
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
  timeRemaining: number;
  timerState: TimerState;
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
  timeRemaining,
  timerState,
}: FieldInputProps) {
  const [pendingEvent, setPendingEvent] = useState<PendingEvent | null>(null);
  const [dialogEventType, setDialogEventType] =
    useState<EventType>("teleop_made");
  const [dialogCount, setDialogCount] = useState<number>(1);
  const imageRef = useRef<HTMLDivElement>(null);

  const isTimerStarted = timerState !== "idle";
  const isAutonomous = timeRemaining > PAUSE_TIME_SECONDS;

  const availableEventTypes = useMemo(() => {
    if (!isTimerStarted) {
      return EVENT_TYPES as readonly EventType[];
    }
    return isAutonomous
      ? (["autonomous_made", "autonomous_missed"] as const)
      : (["teleop_made", "teleop_missed"] as const);
  }, [isTimerStarted, isAutonomous]);

  useEffect(() => {
    if (pendingEvent !== null && isTimerStarted) {
      const isValidType = (availableEventTypes as readonly string[]).includes(
        dialogEventType
      );
      if (!isValidType) {
        const defaultEventType: EventType = isAutonomous
          ? "autonomous_made"
          : "teleop_made";
        setDialogEventType(defaultEventType);
      }
    }
  }, [
    pendingEvent,
    dialogEventType,
    availableEventTypes,
    isAutonomous,
    isTimerStarted,
  ]);

  const ORIGINAL_IMAGE_WIDTH = 2547;
  const ORIGINAL_IMAGE_HEIGHT = 2547;

  function handleFieldClick(event: React.MouseEvent<HTMLDivElement>) {
    if (!imageRef.current) {
      return;
    }

    const rect = imageRef.current.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    const normalizedX = (clickX / rect.width) * ORIGINAL_IMAGE_WIDTH;
    const normalizedY = (clickY / rect.height) * ORIGINAL_IMAGE_HEIGHT;

    const defaultEventType: EventType = isTimerStarted
      ? isAutonomous
        ? "autonomous_made"
        : "teleop_made"
      : "teleop_made";

    setPendingEvent({ x: normalizedX, y: normalizedY });
    setDialogEventType(defaultEventType);
    setDialogCount(1);
  }

  function handleDialogConfirm() {
    if (!pendingEvent) {
      return;
    }

    const newEvent: FieldEventSchema = {
      event: dialogEventType,
      coordinates: { x: pendingEvent.x, y: pendingEvent.y },
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
      {/** biome-ignore lint/a11y/useSemanticElements: PASS */}
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
          src="/ftc-field.webp"
          width={1200}
        />
        {events.map((event) => {
          const leftPercent =
            (event.coordinates.x / ORIGINAL_IMAGE_WIDTH) * 100;
          const topPercent =
            (event.coordinates.y / ORIGINAL_IMAGE_HEIGHT) * 100;

          return (
            <div
              className="-translate-x-1/2 -translate-y-1/2 pointer-events-none absolute size-4 rounded-full border-2 border-red-500 bg-red-500/50"
              key={event.event}
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
        open={pendingEvent !== null}
      >
        <DialogContent className="w-full max-w-sm rounded-xl p-4 sm:p-5">
          <DialogTitle>Add Event</DialogTitle>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {availableEventTypes.map((type) => {
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

// --- FRC Field Input ---

const HOLD_THRESHOLD_MS = 250;
const FRC_ORIGINAL_IMAGE_WIDTH = 2547;
const FRC_ORIGINAL_IMAGE_HEIGHT = 2547;

const FRC_EVENT_TYPES: FrcFieldEventType[] = [
  "shooting",
  "intake",
  "defense",
  "climb",
];

interface PendingFrcHold {
  x: number;
  y: number;
  startTimestamp: string;
  startTimeMs: number;
}

interface FrcFieldInputProps {
  fieldEvents: FrcFieldEvent[];
  autoPath: FrcAutoPath;
  onFieldEventsChange: (events: FrcFieldEvent[]) => void;
  onAutoPathChange: (path: FrcAutoPath) => void;
  getEventTimestamp: () => string;
  getCurrentPeriod: () => FrcPeriod;
  timerState: TimerState;
}

export function FrcFieldInput({
  fieldEvents,
  autoPath,
  onFieldEventsChange,
  onAutoPathChange,
  getEventTimestamp,
  getCurrentPeriod,
  timerState,
}: FrcFieldInputProps) {
  const [pendingHold, setPendingHold] = useState<PendingFrcHold | null>(null);
  const [pendingHoldForDialog, setPendingHoldForDialog] = useState<{
    x: number;
    y: number;
    startTimestamp: string;
    endTimestamp: string;
    durationMs: number;
    period: FrcPeriod;
  } | null>(null);
  const [dialogEventType, setDialogEventType] =
    useState<FrcFieldEventType>("shooting");
  const [dialogAction, setDialogAction] = useState<"scoring" | "feeding">(
    "scoring"
  );
  const [dialogSource, setDialogSource] = useState<
    "floor" | "depot" | "outpost"
  >("floor");
  const [dialogClimbLevel, setDialogClimbLevel] = useState<1 | 2 | 3>(1);
  const imageRef = useRef<HTMLDivElement>(null);

  const isTimerStarted = timerState !== "idle" && timerState !== "finished";
  const isAutoPeriod = useMemo(
    () => isTimerStarted && getCurrentPeriod() === "AUTO",
    [isTimerStarted, getCurrentPeriod]
  );

  const getCoords = useCallback((clientX: number, clientY: number) => {
    if (!imageRef.current) {
      return null;
    }
    const rect = imageRef.current.getBoundingClientRect();
    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;
    return {
      x: x * FRC_ORIGINAL_IMAGE_WIDTH,
      y: y * FRC_ORIGINAL_IMAGE_HEIGHT,
    };
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!isTimerStarted) {
        return;
      }
      e.preventDefault();
      const coords = getCoords(e.clientX, e.clientY);
      if (!coords) {
        return;
      }
      setPendingHold({
        x: coords.x,
        y: coords.y,
        startTimestamp: getEventTimestamp(),
        startTimeMs: Date.now(),
      });
    },
    [isTimerStarted, getCoords, getEventTimestamp]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!pendingHold) {
        return;
      }
      e.preventDefault();
      const durationMs = Date.now() - pendingHold.startTimeMs;
      const endTimestamp = getEventTimestamp();
      const period = getCurrentPeriod();

      if (durationMs >= HOLD_THRESHOLD_MS) {
        setPendingHold(null);
        setDialogEventType("shooting");
        setDialogAction("scoring");
        setDialogSource("floor");
        setDialogClimbLevel(1);
        setPendingHoldForDialog({
          x: pendingHold.x,
          y: pendingHold.y,
          startTimestamp: pendingHold.startTimestamp,
          endTimestamp,
          durationMs,
          period,
        });
      } else if (isAutoPeriod) {
        const point: FrcAutoPathPoint = {
          coordinates: { x: pendingHold.x, y: pendingHold.y },
          timestamp: pendingHold.startTimestamp,
        };
        onAutoPathChange([...autoPath, point]);
        setPendingHold(null);
      } else {
        setPendingHold(null);
      }
    },
    [
      pendingHold,
      getEventTimestamp,
      getCurrentPeriod,
      isAutoPeriod,
      autoPath,
      onAutoPathChange,
    ]
  );

  const handleDialogConfirm = useCallback(() => {
    if (!pendingHoldForDialog) {
      return;
    }

    const durationSec = pendingHoldForDialog.durationMs / 1000;
    const newEvent: FrcFieldEvent = {
      coordinates: {
        x: pendingHoldForDialog.x,
        y: pendingHoldForDialog.y,
      },
      startTimestamp: pendingHoldForDialog.startTimestamp,
      endTimestamp: pendingHoldForDialog.endTimestamp,
      duration: durationSec,
      period: pendingHoldForDialog.period,
      eventType: dialogEventType,
      ...(dialogEventType === "shooting" && { action: dialogAction }),
      ...(dialogEventType === "intake" && { source: dialogSource }),
      ...(dialogEventType === "climb" && { climbLevel: dialogClimbLevel }),
    };

    onFieldEventsChange([...fieldEvents, newEvent]);
    setPendingHoldForDialog(null);
  }, [
    pendingHoldForDialog,
    dialogEventType,
    dialogAction,
    dialogSource,
    dialogClimbLevel,
    fieldEvents,
    onFieldEventsChange,
  ]);

  const handleDialogCancel = useCallback(() => {
    setPendingHoldForDialog(null);
  }, []);

  return (
    <div>
      {/** biome-ignore lint/a11y/useSemanticElements: PASS */}
      <div
        className="relative w-full cursor-crosshair overflow-hidden rounded-lg border"
        onPointerCancel={() => setPendingHold(null)}
        onPointerDown={handlePointerDown}
        onPointerLeave={() => setPendingHold(null)}
        onPointerUp={handlePointerUp}
        ref={imageRef}
        role="button"
        tabIndex={0}
      >
        <Image
          alt="FRC field"
          className="w-full"
          height={800}
          src="/frc-field.webp"
          width={1200}
        />
        <p className="absolute right-0 bottom-0 left-0 z-10 bg-background/80 px-4 py-2 text-muted-foreground text-sm backdrop-blur-sm">
          {isAutoPeriod
            ? "Tap to add AUTO path points. Hold to record an event."
            : "Hold on the field to record an event (shooting, intake, defense, climb)."}
        </p>
        {fieldEvents.map((ev, i) => {
          const leftPercent =
            (ev.coordinates.x / FRC_ORIGINAL_IMAGE_WIDTH) * 100;
          const topPercent =
            (ev.coordinates.y / FRC_ORIGINAL_IMAGE_HEIGHT) * 100;
          return (
            <div
              className="-translate-x-1/2 -translate-y-1/2 pointer-events-none absolute size-4 rounded-full border-2 border-primary bg-primary/50"
              key={`ev-${ev.startTimestamp}-${ev.endTimestamp}-${i}`}
              style={{ left: `${leftPercent}%`, top: `${topPercent}%` }}
            />
          );
        })}
        {autoPath.map((pt: FrcAutoPathPoint, i: number) => {
          const leftPercent =
            (pt.coordinates.x / FRC_ORIGINAL_IMAGE_WIDTH) * 100;
          const topPercent =
            (pt.coordinates.y / FRC_ORIGINAL_IMAGE_HEIGHT) * 100;
          return (
            <div
              className="-translate-x-1/2 -translate-y-1/2 pointer-events-none absolute size-2 rounded-full bg-blue-500"
              key={`path-${pt.timestamp}-${i}`}
              style={{ left: `${leftPercent}%`, top: `${topPercent}%` }}
            />
          );
        })}
      </div>

      <Dialog
        onOpenChange={(open) => !open && handleDialogCancel()}
        open={pendingHoldForDialog !== null}
      >
        <DialogContent className="w-full max-w-sm rounded-xl p-4 sm:p-5">
          <DialogTitle>Record Event</DialogTitle>
          <div className="space-y-4">
            <div className="space-y-2">
              <FormLabel className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                Event type
              </FormLabel>
              <div className="grid grid-cols-2 gap-2">
                {FRC_EVENT_TYPES.map((type) => {
                  const label = type.charAt(0).toUpperCase() + type.slice(1);
                  const isActive = dialogEventType === type;
                  return (
                    <Button
                      className="h-10 justify-center text-sm"
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

            {dialogEventType === "shooting" && (
              <div className="space-y-2">
                <FormLabel className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  Action
                </FormLabel>
                <div className="flex gap-2">
                  {(["scoring", "feeding"] as const).map((a) => (
                    <Button
                      className="flex-1"
                      key={a}
                      onClick={() => setDialogAction(a)}
                      type="button"
                      variant={dialogAction === a ? "default" : "outline"}
                    >
                      {a.charAt(0).toUpperCase() + a.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {dialogEventType === "intake" && (
              <div className="space-y-2">
                <FormLabel className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  Source
                </FormLabel>
                <div className="flex flex-wrap gap-2">
                  {(["floor", "depot", "outpost"] as const).map((s) => (
                    <Button
                      key={s}
                      onClick={() => setDialogSource(s)}
                      type="button"
                      variant={dialogSource === s ? "default" : "outline"}
                    >
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {dialogEventType === "climb" && (
              <div className="space-y-2">
                <FormLabel className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  Climb level
                </FormLabel>
                <div className="flex gap-2">
                  {([1, 2, 3] as const).map((l) => (
                    <Button
                      key={l}
                      onClick={() => setDialogClimbLevel(l)}
                      type="button"
                      variant={dialogClimbLevel === l ? "default" : "outline"}
                    >
                      {l}
                    </Button>
                  ))}
                </div>
              </div>
            )}
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
