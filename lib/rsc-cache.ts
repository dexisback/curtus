import { cache } from "react";
import { prisma } from "@/lib/db";
import { getOrCreateUserSettings } from "@/lib/user-settings";

export const getCachedUserSettings = cache(async (userId: string) => {
  return getOrCreateUserSettings(prisma, userId);
});

export const getCachedDashboardShellUser = cache(async (userId: string) => {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, image: true, email: true },
  });
});

// — rsc-cache.ts: React.cache dedupes session-adjacent Prisma reads within one RSC request.
