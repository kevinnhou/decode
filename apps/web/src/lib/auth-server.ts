import { getToken as getTokenNextjs } from "@convex-dev/better-auth/nextjs";
import { createAuth } from "@decode/backend/convex/auth";

// biome-ignore lint/suspicious/noExplicitAny: PASS
export const getToken = () => getTokenNextjs(createAuth as any);
