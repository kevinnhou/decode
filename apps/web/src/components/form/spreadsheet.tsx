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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@repo/ui/shadcn/form";
import { Input } from "@repo/ui/shadcn/input";
import { Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { getConfig, setConfig } from "@/lib/spreadsheet";
import {
  type SpreadsheetConfigSchema,
  spreadsheetConfig,
} from "@/schema/scouting";

export function SpreadsheetConfig() {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<SpreadsheetConfigSchema>({
    resolver: zodResolver(spreadsheetConfig),
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
          <DialogTitle>Spreadsheet Config</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="spreadsheetId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Spreadsheet ID</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter Spreadsheet ID" {...field} />
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
