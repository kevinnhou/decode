import "@decode/ui/globals.css";
import "@/app/global.css";
import { cn } from "@decode/ui/lib/utils";
import { RootProvider } from "fumadocs-ui/provider/next";
import type { Metadata, Viewport } from "next";
import { Geist, JetBrains_Mono } from "next/font/google";
import type { ReactNode } from "react";
import { JsonLd } from "@/components/jsonld";
import { buildWebsiteJsonLd, siteMetadata } from "@/lib/seo";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  ],
};

const geist = Geist({
  subsets: ["latin"],
  display: "optional",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "optional",
});

export const metadata: Metadata = siteMetadata;

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html
      className={cn("antialiased", geist.className, jetBrainsMono.variable)}
      lang="en-AU"
      suppressHydrationWarning
    >
      <body className="flex min-h-screen flex-col">
        <RootProvider>{children}</RootProvider>
        <JsonLd data={buildWebsiteJsonLd()} />
      </body>
    </html>
  );
}
