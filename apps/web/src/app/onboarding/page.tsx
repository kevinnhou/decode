"use client";

import { api } from "@decode/backend/convex/_generated/api";
import { Button } from "@decode/ui/components/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@decode/ui/components/form";
import { Input } from "@decode/ui/components/input";
import { Logo } from "@decode/ui/components/logo";
import { useForm } from "@decode/ui/lib/react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { ArrowRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

type Mode = "join" | "create";

const joinSchema = z.object({
  inviteCode: z
    .string()
    .min(1, "Invite code is required")
    .max(8, "Invite code is 8 characters"),
});

const createSchema = z.object({
  orgName: z.string().min(1, "Organisation name is required"),
  slug: z.string().min(1, "Slug is required"),
});

type JoinValues = z.infer<typeof joinSchema>;
type CreateValues = z.infer<typeof createSchema>;

export default function OnboardingPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("join");

  const joinOrg = useMutation(api.auth.joinOrganisation);
  const createOrg = useMutation(api.auth.createOrganisation);

  const joinForm = useForm<JoinValues>({
    resolver: zodResolver(joinSchema),
    defaultValues: { inviteCode: "" },
  });

  const createForm = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { orgName: "", slug: "" },
  });

  async function onJoin(values: JoinValues) {
    try {
      const result = await joinOrg({ inviteCode: values.inviteCode.trim() });
      toast.success(`Joined ${result.orgName}`);
      router.push("/scout");
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to join organisation";
      toast.error(message);
    }
  }

  async function onCreate(values: CreateValues) {
    try {
      const result = await createOrg({
        name: values.orgName.trim(),
        slug: values.slug
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, "-"),
      });
      toast.success(`Organisation created! Invite code: ${result.inviteCode}`);
      router.push("/scout");
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to create organisation";
      toast.error(message);
    }
  }

  const isSubmitting =
    joinForm.formState.isSubmitting || createForm.formState.isSubmitting;

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-12">
      <div className="grid w-full max-w-4xl gap-12 md:grid-cols-2 md:gap-16">
        {/* Left — Context */}
        <div className="flex flex-col justify-center space-y-6 max-md:items-center max-md:text-center">
          <Logo className="h-16 w-16 text-foreground" />
          <div className="space-y-2">
            <h1 className="font-semibold text-3xl tracking-tight">
              Join an organisation
            </h1>
            <p className="max-w-xs text-muted-foreground leading-relaxed">
              Enter your team&apos;s invite code or create a new organisation to
              get started.
            </p>
          </div>
        </div>

        {/* Right — Form */}
        <div className="flex flex-col justify-center">
          {mode === "join" ? (
            <div key="join">
              <Form {...joinForm}>
                <form
                  className="space-y-4"
                  onSubmit={joinForm.handleSubmit(onJoin)}
                >
                  <FormField
                    control={joinForm.control}
                    name="inviteCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Invite Code</FormLabel>
                        <FormControl>
                          <Input
                            className="font-mono uppercase tracking-widest"
                            maxLength={8}
                            placeholder="ABCD1234"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Available from your team admin.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    className="w-full gap-2 rounded-xl font-mono"
                    disabled={isSubmitting}
                    type="submit"
                  >
                    {joinForm.formState.isSubmitting ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <>
                        Join
                        <ArrowRight className="size-4" />
                      </>
                    )}
                  </Button>
                </form>
              </Form>

              <p className="mt-4 text-center text-muted-foreground text-xs">
                No invite code?{" "}
                <button
                  className="text-foreground underline underline-offset-4 transition-colors hover:text-primary"
                  onClick={() => setMode("create")}
                  type="button"
                >
                  Create one
                </button>
              </p>
            </div>
          ) : (
            <div key="create">
              <Form {...createForm}>
                <form
                  className="space-y-4"
                  onSubmit={createForm.handleSubmit(onCreate)}
                >
                  <FormField
                    control={createForm.control}
                    name="orgName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Organisation Name</FormLabel>
                        <FormControl>
                          <Input placeholder="My Robotics Team" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={createForm.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Slug</FormLabel>
                        <FormControl>
                          <Input placeholder="my-team" {...field} />
                        </FormControl>
                        <FormDescription className="text-xs">
                          URL-safe identifier for your organisation.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    className="w-full gap-2 rounded-xl font-mono"
                    disabled={isSubmitting}
                    type="submit"
                  >
                    {createForm.formState.isSubmitting ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <>
                        Create
                        <ArrowRight className="size-4" />
                      </>
                    )}
                  </Button>
                </form>
              </Form>

              <p className="mt-4 text-center text-muted-foreground text-xs">
                Have an invite code?{" "}
                <button
                  className="text-foreground underline underline-offset-4 transition-colors hover:text-primary"
                  onClick={() => setMode("join")}
                  type="button"
                >
                  Join instead
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
