import "@repo/ui/globals.css";

import type { Viewport } from "next";

import localFont from "next/font/local";

const alliance = localFont({
  src: [
    {
      path: "./AllianceNo2-Regular.woff2",
      weight: "400",
      style: "normal",
    },
  ],
});

import { Noto_Sans_Mono } from "next/font/google";

import Providers from "~/providers";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      className={`${alliance.className} ${NotoSansMono.variable} antialiased`}
      lang="en"
      suppressHydrationWarning
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
