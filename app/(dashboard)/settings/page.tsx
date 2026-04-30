import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import SettingsClient from "@/components/settings/settings-client";
import { getOrCreateUserSettings } from "@/lib/user-settings";

export default async function SettingsPage() {
  const session = await requireSession();
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, image: true },
  });
  const settings = await getOrCreateUserSettings(prisma, session.user.id);

  return (
    <SettingsClient
      initialName={user?.name ?? ""}
      initialEmail={user?.email ?? ""}
      initialImage={user?.image ?? null}
      initialSettings={settings}
    />
  );
}
