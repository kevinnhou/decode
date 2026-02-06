"use client";

import { Button } from "@decode/ui/components/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@decode/ui/components/form";
import { Input } from "@decode/ui/components/input";
import { Logo } from "@decode/ui/components/logo";
import { useForm } from "@decode/ui/lib/react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Loader2 } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { authClient } from "@/lib/auth-client";

const signupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type SignupValues = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  const isLoading = form.formState.isSubmitting || isRedirecting;

  async function onSubmit(values: SignupValues) {
    try {
      const result = await authClient.signUp.email(values);

      if (result.error) {
        toast.error(result.error.message ?? "Sign up failed");
        return;
      }

      setIsRedirecting(true);
      router.push("/scout");
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-12">
      <div className="grid w-full max-w-4xl gap-12 md:grid-cols-2 md:gap-16">
        {/* Left — Branding */}
        <div className="flex flex-col justify-center space-y-6 max-md:items-center max-md:text-center">
          <Logo className="h-16 w-16 text-foreground" />
          <div className="space-y-2">
            <h1 className="font-semibold text-3xl tracking-tight">
              Create an account
            </h1>
            <p className="max-w-xs text-muted-foreground leading-relaxed">
              Set up your account to start scouting with your team.
            </p>
          </div>
        </div>

        {/* Right — Form */}
        <div className="flex flex-col justify-center">
          <Form {...form}>
            <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your name" type="text" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="you@example.com"
                        type="email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="********"
                        type="password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                className="w-full gap-2 rounded-xl font-mono"
                disabled={isLoading}
                type="submit"
              >
                {isLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <>
                    Get Started
                    <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
            </form>
          </Form>

          <p className="mt-4 text-center text-muted-foreground text-xs">
            Already have an account?{" "}
            <Link
              className="text-foreground underline underline-offset-4 transition-colors hover:text-primary"
              href={"/login" as Route}
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
