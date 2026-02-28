import type { Metadata, Route } from "next";
import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/convex";
import { generateMetadata as genMeta } from "@/lib/metadata";

export const metadata: Metadata = genMeta({
  title: "Join organisation",
  description:
    "Enter your team's invite code or create a new organisation to get started.",
  openGraph: {
    title: "Join organisation",
    description:
      "Enter your team's invite code or create a new organisation to get started.",
    url: "/onboarding",
  },
});

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isAuthenticated())) {
    redirect("/login" as Route);
  }

  return <>{children}</>;
}
