import "@repo/ui/globals.css";
import "@/app/global.css";

import { RootProvider } from "fumadocs-ui/provider";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Viewport } from "next";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

export default function Layout({ children }: LayoutProps<"/">) {
  return (
    <html
      className={`${GeistSans.className} ${GeistMono.variable} antialiased`}
      lang="en"
      suppressHydrationWarning
    >
      <body className="flex min-h-svh flex-col">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
