import type { Metadata } from "next";
import { generateMetadata as genMeta } from "@/lib/metadata";

export const metadata: Metadata = genMeta({
  title: "FTC Match Scouting",
  description: "Match scouting for FIRST Tech Challenge.",
  openGraph: {
    title: "FTC Match Scouting",
    description: "Match scouting for FIRST Tech Challenge.",
    url: "/scout/ftc/match",
  },
});

export default function FtcMatchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
