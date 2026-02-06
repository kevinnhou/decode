import type { Route } from "next";
import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/convex";

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
