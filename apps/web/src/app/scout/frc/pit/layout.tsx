import type { Metadata } from "next";
import { generateMetadata as genMeta } from "@/lib/metadata";

export const metadata: Metadata = genMeta({
  title: "FRC Pit Scouting",
  description: "Pit scouting for FIRST Robotics Competition.",
  openGraph: {
    title: "FRC Pit Scouting",
    description: "Pit scouting for FIRST Robotics Competition.",
    url: "/scout/frc/pit",
  },
});

export default function FrcPitLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
