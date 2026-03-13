import { api } from "@decode/backend/convex/_generated/api";
import type { Metadata, Route } from "next";
import { redirect } from "next/navigation";
import { fetchAuthQuery, isAuthenticated } from "@/lib/convex";
import { generateMetadata as genMeta } from "@/lib/metadata/index";

export const metadata: Metadata = genMeta({
  title: "Analyse",
  description: "Analysis and insights.",
  openGraph: {
    title: "Analyse",
    description: "Analysis and insights.",
    url: "/analyse",
  },
});

export default async function AnalyseLayout({
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
