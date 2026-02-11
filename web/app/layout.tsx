import type { Metadata } from "next";
import { Manrope, Sora } from "next/font/google";

import "./globals.css";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-display",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_APP_TITLE ?? "AgencyPro Gen2 Agent",
  description: "LangGraph + Composio autonomous agent UI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${sora.variable} ${manrope.variable} bg-canvas font-body text-ink`}>{children}</body>
    </html>
  );
}
