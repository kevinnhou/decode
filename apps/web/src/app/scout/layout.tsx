import { api } from "@decode/backend/convex/_generated/api";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { fetchAuthQuery, isAuthenticated } from "@/lib/convex";

export default async function ScoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Gate: require signed-in user
  if (!(await isAuthenticated())) {
    redirect("/login" as Route);
  }

  // Gate: require user profile (must belong to an organisation)
  const profile = await fetchAuthQuery(api.auth.getCurrentUserProfile);
  if (!profile) {
    redirect("/onboarding" as Route);
  }

  return <>{children}</>;
}
