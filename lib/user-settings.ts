import type { PrismaClient } from '@prisma/client';

export type SerializedUserSettings = {
  theme: 'light' | 'dark';
  soundEnabled: boolean;
  compactSidebar: boolean;
  sessionReminders: boolean;
  friendActivity: boolean;
  roomInvites: boolean;
  leaderboardUpdates: boolean;
  todoDdayDate: string;
  todoDdayTitle: string;
};

export const DEFAULT_USER_SETTINGS: SerializedUserSettings = {
  theme: 'light',
  soundEnabled: true,
  compactSidebar: false,
  sessionReminders: true,
  friendActivity: false,
  roomInvites: true,
  leaderboardUpdates: false,
  todoDdayDate: '2026-06-01',
  todoDdayTitle: 'D-Day milestone',
};

export function serializeUserSettings(
  settings: {
    theme: 'LIGHT' | 'DARK';
    soundEnabled: boolean;
    compactSidebar: boolean;
    sessionReminders: boolean;
    friendActivity: boolean;
    roomInvites: boolean;
    leaderboardUpdates: boolean;
    todoDdayDate: string | null;
    todoDdayTitle: string | null;
  } | null,
): SerializedUserSettings {
  if (!settings) return DEFAULT_USER_SETTINGS;
  return {
    theme: settings.theme === 'DARK' ? 'dark' : 'light',
    soundEnabled: settings.soundEnabled,
    compactSidebar: settings.compactSidebar,
    sessionReminders: settings.sessionReminders,
    friendActivity: settings.friendActivity,
    roomInvites: settings.roomInvites,
    leaderboardUpdates: settings.leaderboardUpdates,
    todoDdayDate: settings.todoDdayDate ?? DEFAULT_USER_SETTINGS.todoDdayDate,
    todoDdayTitle: settings.todoDdayTitle ?? '',
  };
}

export async function getOrCreateUserSettings(
  prisma: PrismaClient,
  userId: string,
): Promise<SerializedUserSettings> {
  const settings = await prisma.userSettings.upsert({
    where: { userId },
    update: {},
    create: { userId },
    select: {
      theme: true,
      soundEnabled: true,
      compactSidebar: true,
      sessionReminders: true,
      friendActivity: true,
      roomInvites: true,
      leaderboardUpdates: true,
      todoDdayDate: true,
      todoDdayTitle: true,
    },
  });

  return serializeUserSettings(settings);
}

// — user-settings.ts: Prisma user_settings ↔ client JSON shape; defaults and upsert helper.
