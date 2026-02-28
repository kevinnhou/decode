import type { Metadata, Route } from "next";
import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/convex";
import { generateMetadata as genMeta } from "@/lib/metadata";

export const metadata: Metadata = genMeta({
  title: "Sign in",
  description: "Sign in to your account to continue scouting.",
  openGraph: {
    title: "Sign in",
    description: "Sign in to your account to continue scouting.",
    url: "/login",
  },
});

export default async function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (await isAuthenticated()) {
    redirect("/scout" as Route);
  }

  return <>{children}</>;
}
