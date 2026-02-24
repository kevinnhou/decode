import type { Route } from "next";
import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/convex";

export default async function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isAuthenticated())) {
    redirect("/login" as Route);
  }

  return <>{children}</>;
}
