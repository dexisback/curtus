"use client";

import { SoundProvider } from "@/components/sound-provider";
import { ThemeProvider } from "@/components/theme-provider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <SoundProvider>{children}</SoundProvider>
    </ThemeProvider>
  );
}

// — Client providers (theme, sound, etc.) for the app tree.
