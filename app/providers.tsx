'use client';

import { ServerUserSettingsProvider } from '@/components/server-user-settings';
import { SoundProvider } from '@/components/sound-provider';
import { StudyTimerProvider } from '@/components/study-timer-provider';
import { ThemeProvider } from '@/components/theme-provider';
import { WhiteNoiseProvider } from '@/components/white-noise-provider';
import StudyTimerInactivityGuard from '@/components/timer/study-timer-inactivity-guard';
import type { SerializedUserSettings } from '@/lib/user-settings';

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
          <StudyTimerProvider>
            <WhiteNoiseProvider>
              {children}
              <StudyTimerInactivityGuard />
            </WhiteNoiseProvider>
          </StudyTimerProvider>
        </SoundProvider>
      </ThemeProvider>
    </ServerUserSettingsProvider>
  );
}

// — Client providers; initialUserSettings from root layout avoids duplicate /api/settings GETs.
