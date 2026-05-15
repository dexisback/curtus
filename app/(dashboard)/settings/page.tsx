import { requireSession } from '@/lib/session';
import { prisma } from '@/lib/db';
import { getOrCreateUserSettings } from '@/lib/user-settings';
import SettingsClient from '@/components/settings/settings-client';

export default async function SettingsPage() {
  const session = await requireSession();
  const [user, settings] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true, image: true },
    }),
    getOrCreateUserSettings(prisma, session.user.id),
  ]);

  return (
    <SettingsClient
      initialName={user?.name ?? ''}
      initialEmail={user?.email ?? ''}
      initialImage={user?.image ?? null}
      initialSettings={settings}
    />
  );
}

// — Settings page wrapper around SettingsClient.
