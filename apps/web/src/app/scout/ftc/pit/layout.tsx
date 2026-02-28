import type { Metadata } from "next";
import { generateMetadata as genMeta } from "@/lib/metadata";

export const metadata: Metadata = genMeta({
  title: "FTC Pit Scouting",
  description: "Pit scouting for FIRST Tech Challenge.",
  openGraph: {
    title: "FTC Pit Scouting",
    description: "Pit scouting for FIRST Tech Challenge.",
    url: "/scout/ftc/pit",
  },
});

export default function FtcPitLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
