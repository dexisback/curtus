import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import SocketPrewarm from "@/components/socket-prewarm";
import Providers from "./providers";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StudyWithMe",
  description: "Study rooms, shared focus, and accountability.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <Providers>
          <SocketPrewarm />
          {children}
        </Providers>
      </body>
    </html>
  );
}

// — Root layout: fonts, theme, providers, metadata.
