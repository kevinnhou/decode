"use client";

import { Button } from "@decode/ui/components/button";
import { Separator } from "@decode/ui/components/separator";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";

type GoogleSignInProps = {
  callbackURL?: string;
  disabled?: boolean;
};

export function GoogleSignIn({
  callbackURL = "/scout",
  disabled,
}: GoogleSignInProps) {
  const [isSigningIn, setIsSigningIn] = useState(false);

  async function handleGoogleSignIn(e: React.MouseEvent) {
    e.preventDefault();
    if (isSigningIn || disabled) {
      return;
    }

    setIsSigningIn(true);
    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL,
      });

      if (result?.error) {
        toast.error(result.error.message ?? "Sign in with Google failed");
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Sign in with Google failed"
      );
      setIsSigningIn(false);
    }
  }

  const isDisabled = disabled || isSigningIn;

  return (
    <div className="space-y-4">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <Separator />
        </div>
        <div className="relative flex justify-center text-muted-foreground text-xs uppercase">
          <span className="bg-background px-2">or continue with</span>
        </div>
      </div>

      <Button
        className="w-full gap-2 rounded-xl font-mono"
        disabled={isDisabled}
        onClick={handleGoogleSignIn}
        type="button"
        variant="outline"
      >
        {isSigningIn ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <GoogleIcon className="size-4" />
        )}
        {isSigningIn ? "Redirecting to Google…" : "Continue with Google"}
      </Button>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={className}
      role="img"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>Google</title>
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}
