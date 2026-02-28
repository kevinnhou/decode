import type { Metadata, Route } from "next";
import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/convex";
import { generateMetadata as genMeta } from "@/lib/metadata";

export const metadata: Metadata = genMeta({
  title: "Create account",
  description: "Set up your account to start scouting with your team.",
  openGraph: {
    title: "Create account",
    description: "Set up your account to start scouting with your team.",
    url: "/signup",
  },
});

export default async function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (await isAuthenticated()) {
    redirect("/scout" as Route);
  }

  return <>{children}</>;
}
