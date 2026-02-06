import { convexBetterAuthNextJs } from "@convex-dev/better-auth/nextjs";

export const {
  getToken,
  handler,
  isAuthenticated,
  fetchAuthQuery,
  fetchAuthMutation,
  fetchAuthAction,
  preloadAuthQuery,
} = convexBetterAuthNextJs({
  // biome-ignore lint/style/noNonNullAssertion: required env var
  convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL!,
  // biome-ignore lint/style/noNonNullAssertion: required env var
  convexSiteUrl: process.env.NEXT_PUBLIC_CONVEX_SITE_URL!,
});
