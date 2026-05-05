import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import SocketPrewarm from "@/components/socket-prewarm";
import { getCachedUserSettings } from "@/lib/rsc-cache";
import { getServerSession } from "@/lib/session";
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let session: Awaited<ReturnType<typeof getServerSession>> = null;
  try {
    session = await getServerSession();
  } catch (err) {
    console.warn("[layout] getServerSession failed; continuing unauthenticated", err);
  }

  let initialUserSettings = null;
  if (session) {
    try {
      initialUserSettings = await getCachedUserSettings(session.user.id);
    } catch (err) {
      console.warn("[layout] getCachedUserSettings failed; continuing with defaults", err);
      initialUserSettings = null;
    }
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <Providers initialUserSettings={initialUserSettings}>
          <SocketPrewarm />
          {children}
        </Providers>
      </body>
    </html>
  );
}

// — Root layout: fonts, one Prisma settings read when session exists, providers, metadata.
