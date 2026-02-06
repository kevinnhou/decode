import "@decode/ui/globals.css";

import { SidebarInset, SidebarProvider } from "@decode/ui/components/sidebar";
import type { Metadata, Viewport } from "next";
import { Noto_Sans_Mono } from "next/font/google";
import localFont from "next/font/local";
import Script from "next/script";
import { generateMetadata, generateStructuredData } from "@/lib/metadata";
import { Header } from "~/header";
import Providers from "~/providers";
import { RootTransition } from "~/root-transition";

import { AppSidebar } from "~/sidebar/app";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

const NotoSansMono = Noto_Sans_Mono({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-mono",
});

const alliance = localFont({
  src: [
    {
      path: "./AllianceNo2-Regular.woff2",
      weight: "400",
      style: "normal",
    },
  ],
});

export const metadata: Metadata = generateMetadata();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      className={`${alliance.className} ${NotoSansMono.variable} antialiased`}
      dir="ltr"
      lang="en"
      suppressHydrationWarning
    >
      <head>
        <Script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: PASS
          dangerouslySetInnerHTML={generateStructuredData()}
          type="application/ld+json"
        />
      </head>
      <body className="overflow-hidden">
        <Providers>
          <RootTransition>
            <SidebarProvider className="flex h-full flex-col">
              <Header />
              <div className="flex flex-1 overflow-hidden">
                <AppSidebar />
                <SidebarInset className="overflow-y-auto">
                  {children}
                </SidebarInset>
              </div>
            </SidebarProvider>
          </RootTransition>
        </Providers>
      </body>
    </html>
  );
}
