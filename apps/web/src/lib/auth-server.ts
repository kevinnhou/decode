import { getToken as getTokenNextjs } from "@convex-dev/better-auth/nextjs";
import { createAuth } from "@decode/backend/convex/auth";

export const getToken = () => getTokenNextjs(createAuth);
