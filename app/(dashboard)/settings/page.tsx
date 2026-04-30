import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import SettingsClient from "@/components/settings/settings-client";

export default async function SettingsPage() {
  const session = await requireSession();
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, image: true },
  });

  return (
    <SettingsClient
      initialName={user?.name ?? ""}
      initialEmail={user?.email ?? ""}
      initialImage={user?.image ?? null}
    />
  );
}
