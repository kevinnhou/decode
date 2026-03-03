import { api } from "@decode/backend/convex/_generated/api";
import type { Metadata, Route } from "next";
import { redirect } from "next/navigation";
import { fetchAuthQuery, isAuthenticated } from "@/lib/convex";
import { generateMetadata as genMeta } from "@/lib/metadata";

export const metadata: Metadata = genMeta({
  title: "Scout",
  description: "Match and pit scouting for FIRST Robotics competitions.",
  openGraph: {
    title: "Scout",
    description: "Match and pit scouting for FIRST Robotics competitions.",
    url: "/scout",
  },
});

export default async function ScoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isAuthenticated())) {
    redirect("/login" as Route);
  }

  const profile = await fetchAuthQuery(api.auth.getCurrentUserProfile);
  if (!profile) {
    redirect("/onboarding" as Route);
  }

  return <>{children}</>;
}
