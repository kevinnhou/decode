"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@repo/ui/shadcn/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui/shadcn/dialog";
import {
  Dropzone as DropzoneComponent,
  DropzoneContent,
  DropzoneEmptyState,
} from "@repo/ui/shadcn/dropzone";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@repo/ui/shadcn/form";
import { Input } from "@repo/ui/shadcn/input";
import { FileJson, Settings, Upload } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { getConfig, setConfig } from "@/lib/config";
import {
  type SpreadsheetConfigSchema,
  spreadsheetConfigSchema,
} from "@/schema/scouting";

function extractSpreadsheetId(input: string): string {
  if (!(input.includes("/") || input.includes(":"))) {
    return input.trim();
  }

  const urlMatch = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (urlMatch?.[1]) {
    return urlMatch[1];
  }

  return input.trim();
}

type ConfigProps = {
  onTeamMapLoad: (map: Record<string, string>) => void;
  loadedCount?: number;
};

export function Config({ onTeamMapLoad, loadedCount = 0 }: ConfigProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [teamFiles, setTeamFiles] = useState<File[]>();
  const [isTeamMapLoading, setIsTeamMapLoading] = useState(false);

  const form = useForm<SpreadsheetConfigSchema>({
    resolver: zodResolver(spreadsheetConfigSchema),
    defaultValues: {
      spreadsheetId: "",
      sheetId: "",
    },
  });

  useEffect(() => {
    if (open) {
      const config = getConfig();
      if (config) {
        form.reset(config);
      } else {
        form.reset({
          spreadsheetId: "",
          sheetId: "",
        });
      }
    }
  }, [open, form]);

  function onSubmit(data: SpreadsheetConfigSchema): void {
    setIsLoading(true);
    try {
      setConfig(data);
      setOpen(false);
      form.reset(data);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button className="size-9 shrink-0 rounded" size="icon" type="button">
          <Settings />
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-xl">
        <DialogHeader>
          <DialogTitle>Config</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="spreadsheetId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Spreadsheet ID</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter Spreadsheet ID or URL"
                        {...field}
                        onChange={(e) => {
                          const extractedId = extractSpreadsheetId(
                            e.target.value
                          );
                          field.onChange(extractedId);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sheetId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sheet ID</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter Sheet ID" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Dropzone
              isLoading={isTeamMapLoading}
              loadedCount={loadedCount}
              onDrop={setTeamFiles}
              onTeamMapLoad={onTeamMapLoad}
              setIsLoading={setIsTeamMapLoading}
              src={teamFiles}
            />

            <DialogFooter>
              <Button
                disabled={isLoading}
                onClick={() => setOpen(false)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button disabled={isLoading} type="submit">
                {isLoading ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

type DropzoneProps = {
  onTeamMapLoad: (map: Record<string, string>) => void;
  loadedCount?: number;
  src?: File[];
  onDrop: (files: File[]) => void;
  isLoading: boolean;
  setIsLoading: (value: boolean) => void;
};

function Dropzone({
  onTeamMapLoad,
  loadedCount = 0,
  src,
  onDrop,
  isLoading,
  setIsLoading,
}: DropzoneProps) {
  const handleDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const [file] = acceptedFiles;
      if (!file) {
        return;
      }

      setIsLoading(true);
      try {
        const content = await file.text();
        const parsed = JSON.parse(content) as unknown;

        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          throw new Error("Invalid JSON shape");
        }

        const entries = Object.entries(
          parsed as Record<string, unknown>
        ).reduce(
          (acc, [key, value]) => {
            if (typeof value !== "string") {
              return acc;
            }

            const normalisedKey = key.trim();
            if (!normalisedKey) {
              return acc;
            }

            acc[normalisedKey] = value.trim();
            return acc;
          },
          {} as Record<string, string>
        );

        if (Object.keys(entries).length === 0) {
          throw new Error("No team names found");
        }

        onDrop([file]);
        onTeamMapLoad(entries);
        const newCount = Object.keys(entries).length;
        toast.success(
          `Loaded ${newCount} team${newCount === 1 ? "" : "s"}${loadedCount > 0 ? " (merged with existing)" : ""}`
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Invalid team JSON file";
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [onTeamMapLoad, onDrop, setIsLoading, loadedCount]
  );

  return (
    <div className="space-y-2">
      <DropzoneComponent
        accept={{ "application/json": [".json"] }}
        className="w-full"
        disabled={isLoading}
        maxFiles={1}
        onDrop={(accepted) => {
          void handleDrop(accepted);
        }}
        src={src}
      >
        <DropzoneContent />
        <DropzoneEmptyState>
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="flex size-10 items-center justify-center rounded-full bg-muted">
              {isLoading ? (
                <Upload className="size-5 animate-pulse text-muted-foreground" />
              ) : (
                <FileJson className="size-5 text-muted-foreground" />
              )}
            </div>
            <div className="space-y-1 text-center">
              <p className="font-medium text-sm">
                {isLoading ? "Loading..." : "Upload Teams"}
              </p>
              <p className="text-muted-foreground text-xs">
                {loadedCount > 0
                  ? "Drag & drop or click to add more teams"
                  : "Drag & drop or click to upload JSON"}
              </p>
            </div>
          </div>
        </DropzoneEmptyState>
        {loadedCount > 0 && (
          <div className="mt-4 flex items-center gap-2 rounded-full bg-muted/50 px-3 py-1 text-muted-foreground text-xs">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-green-500" />
            </span>
            {loadedCount} entries loaded
          </div>
        )}
      </DropzoneComponent>
    </div>
  );
}
