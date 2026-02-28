import type { Metadata } from "next";
import { generateMetadata as genMeta } from "@/lib/metadata";

export const metadata: Metadata = genMeta({
  title: "FRC Match Scouting",
  description: "Match scouting for FIRST Robotics Competition.",
  openGraph: {
    title: "FRC Match Scouting",
    description: "Match scouting for FIRST Robotics Competition.",
    url: "/scout/frc/match",
  },
});

export default function FrcMatchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
