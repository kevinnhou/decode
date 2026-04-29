import { api } from "@decode/backend/convex/_generated/api";
import type { Metadata, Route } from "next";
import { redirect } from "next/navigation";
import { fetchAuthQuery, isAuthenticated } from "@/lib/convex";
import { generateMetadata as genMeta } from "@/lib/metadata";

export const metadata: Metadata = genMeta({
  title: "Profile",
  description: "Manage your account and organisation settings.",
  openGraph: {
    title: "Profile",
    description: "Manage your account and organisation settings.",
    url: "/profile",
  },
});

export default async function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isAuthenticated())) {
    redirect("/login" as Route);
  }

  const profile = await fetchAuthQuery(api.auth.getCurrentUserProfile);
  if (!profile) {
    redirect("/onboarding?needOrganisation=1" as Route);
  }

  const organisation = await fetchAuthQuery(api.auth.getOrganisation);
  if (!organisation) {
    redirect("/onboarding?needOrganisation=1" as Route);
  }

  return <>{children}</>;
}
