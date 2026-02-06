"use client";

import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { UIProviders } from "@decode/ui/components/providers";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ConvexReactClient } from "convex/react";
import { authClient } from "@/lib/auth-client";
import { queryClient } from "@/utils/trpc";

const convex = new ConvexReactClient(
  // biome-ignore lint/style/noNonNullAssertion: PASS
  process.env.NEXT_PUBLIC_CONVEX_URL!
);

export default function Providers({
  children,
  convexToken,
}: {
  children: React.ReactNode;
  convexToken?: string | null;
}) {
  return (
    <UIProviders>
      <ConvexBetterAuthProvider
        authClient={authClient}
        client={convex}
        initialToken={convexToken}
      >
        <QueryClientProvider client={queryClient}>
          {children}
          <ReactQueryDevtools />
        </QueryClientProvider>
      </ConvexBetterAuthProvider>
    </UIProviders>
  );
}
