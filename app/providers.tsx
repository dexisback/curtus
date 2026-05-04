"use client";

import { ServerUserSettingsProvider } from "@/components/server-user-settings";
import { SoundProvider } from "@/components/sound-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { WhiteNoiseProvider } from "@/components/white-noise-provider";
import type { SerializedUserSettings } from "@/lib/user-settings";

export default function Providers({
  children,
  initialUserSettings,
}: {
  children: React.ReactNode;
  initialUserSettings: SerializedUserSettings | null;
}) {
  return (
    <ServerUserSettingsProvider value={initialUserSettings}>
      <ThemeProvider>
        <SoundProvider>
          <WhiteNoiseProvider>{children}</WhiteNoiseProvider>
        </SoundProvider>
      </ThemeProvider>
    </ServerUserSettingsProvider>
  );
}

// — Client providers; initialUserSettings from root layout avoids duplicate /api/settings GETs.
