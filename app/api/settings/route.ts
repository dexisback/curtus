import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { parseRequestJson } from "@/lib/api";
import { requireApiSession, withApi } from "@/lib/api-session";
import { enforce, limiters } from "@/lib/ratelimit";
import { getOrCreateUserSettings, serializeUserSettings } from "@/lib/user-settings";

const patchSchema = z.object({
  theme: z.enum(["light", "dark"]).optional(),
  soundEnabled: z.boolean().optional(),
  compactSidebar: z.boolean().optional(),
  sessionReminders: z.boolean().optional(),
  friendActivity: z.boolean().optional(),
  roomInvites: z.boolean().optional(),
  leaderboardUpdates: z.boolean().optional(),
});

export const GET = withApi(async () => {
  const session = await requireApiSession();
  const settings = await getOrCreateUserSettings(prisma, session.user.id);
  return NextResponse.json(settings);
});

export const PATCH = withApi(async (request: Request) => {
  const session = await requireApiSession();
  const headers = await enforce(limiters.settingsWrite, session.user.id);
  const parsed = await parseRequestJson(request, patchSchema);
  if (!parsed.success) return parsed.response;

  const data = parsed.data;
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const updated = await prisma.userSettings.upsert({
    where: { userId: session.user.id },
    update: {
      ...(data.theme !== undefined ? { theme: data.theme === "dark" ? "DARK" : "LIGHT" } : {}),
      ...(data.soundEnabled !== undefined ? { soundEnabled: data.soundEnabled } : {}),
      ...(data.compactSidebar !== undefined ? { compactSidebar: data.compactSidebar } : {}),
      ...(data.sessionReminders !== undefined ? { sessionReminders: data.sessionReminders } : {}),
      ...(data.friendActivity !== undefined ? { friendActivity: data.friendActivity } : {}),
      ...(data.roomInvites !== undefined ? { roomInvites: data.roomInvites } : {}),
      ...(data.leaderboardUpdates !== undefined ? { leaderboardUpdates: data.leaderboardUpdates } : {}),
    },
    create: {
      userId: session.user.id,
      ...(data.theme !== undefined ? { theme: data.theme === "dark" ? "DARK" : "LIGHT" } : {}),
      ...(data.soundEnabled !== undefined ? { soundEnabled: data.soundEnabled } : {}),
      ...(data.compactSidebar !== undefined ? { compactSidebar: data.compactSidebar } : {}),
      ...(data.sessionReminders !== undefined ? { sessionReminders: data.sessionReminders } : {}),
      ...(data.friendActivity !== undefined ? { friendActivity: data.friendActivity } : {}),
      ...(data.roomInvites !== undefined ? { roomInvites: data.roomInvites } : {}),
      ...(data.leaderboardUpdates !== undefined ? { leaderboardUpdates: data.leaderboardUpdates } : {}),
    },
    select: {
      theme: true,
      soundEnabled: true,
      compactSidebar: true,
      sessionReminders: true,
      friendActivity: true,
      roomInvites: true,
      leaderboardUpdates: true,
    },
  });

  return NextResponse.json(serializeUserSettings(updated), { headers });
});
