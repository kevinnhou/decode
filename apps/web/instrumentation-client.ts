import posthog from "posthog-js";

// biome-ignore lint/style/noNonNullAssertion: PASS
posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  defaults: "2026-01-30",
});
