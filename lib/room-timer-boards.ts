import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";
import { ROOM_BOARD_MEMBER_PREVIEW_LIMIT } from "@/lib/dashboard-room";
import { getStudyDayStart } from "@/lib/periods";
import {
  liveSessionRedisKey,
  todaySecondsRedisKey,
  type LiveSessionPayload,
} from "@/lib/study-live-session";

function initialsFromName(displayName: string) {
  const parts = displayName.trim().split(/\s+/);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export type RoomBoardsMode = "dashboard" | "rooms";

/** Shared loader for dashboard + /rooms mini boards (Prisma today + Redis live session). */
export async function getRoomTimerBoards(userId: string, mode: RoomBoardsMode) {
  const now = new Date();
  const todayStart = getStudyDayStart(now);

  const membershipRooms =
    mode === "dashboard"
      ? await prisma.roomMember.findMany({
          where: { userId },
          orderBy: { joinedAt: "desc" },
          take: 6,
          select: {
            room: {
              select: {
                id: true,
                code: true,
                name: true,
                members: {
                  take: ROOM_BOARD_MEMBER_PREVIEW_LIMIT,
                  select: {
                    user: { select: { id: true, name: true, image: true } },
                  },
                  orderBy: { joinedAt: "asc" },
                },
              },
            },
          },
        })
      : [];

  const boardRooms =
    mode === "rooms"
      ? await prisma.room.findMany({
          where: {
            OR: [{ isPublic: true }, { members: { some: { userId } } }],
          },
          orderBy: { createdAt: "desc" },
          take: 6,
          select: {
            id: true,
            code: true,
            name: true,
            members: {
              take: ROOM_BOARD_MEMBER_PREVIEW_LIMIT,
              select: {
                user: { select: { id: true, name: true, image: true } },
              },
              orderBy: { joinedAt: "asc" },
            },
          },
        })
      : [];

  const rooms =
    mode === "dashboard"
      ? membershipRooms.map((m) => m.room)
      : boardRooms;

  const memberIds = Array.from(
    new Set(rooms.flatMap((room) => room.members.map((mem) => mem.user.id))),
  );

  const crossTodayRows =
    memberIds.length === 0
      ? []
      : await prisma.dailyStats.groupBy({
          by: ["userId"],
          where: { userId: { in: memberIds }, date: todayStart },
          _sum: { totalMinutes: true },
        });

  const todayMinutesByUserId = new Map(
    crossTodayRows.map((row) => [row.userId, row._sum.totalMinutes ?? 0]),
  );
  const todaySecondsByUserId = new Map<string, number>();

  let liveByUserId: Map<string, LiveSessionPayload> | null = null;
  const redisClient = redis;
  if (redisClient && memberIds.length > 0) {
    try {
      const keys = memberIds.map((id) => liveSessionRedisKey(id));
      const vals = await Promise.all(keys.map((k) => redisClient.get<LiveSessionPayload>(k)));
      liveByUserId = new Map();
      memberIds.forEach((id, i) => {
        const v = vals[i];
        if (v) liveByUserId!.set(id, v);
      });
    } catch (err) {
      // Keep board APIs and RSC pages resilient when Upstash fetch throws (can surface as ErrorEvent).
      console.warn("[room-boards] live session read failed; continuing without live status", err);
      liveByUserId = null;
    }
  }

  if (redisClient && memberIds.length > 0) {
    try {
      const keys = memberIds.map((id) => todaySecondsRedisKey(id));
      const vals = await Promise.all(keys.map((k) => redisClient.get<unknown>(k)));
      memberIds.forEach((id, i) => {
        const parsed = Number(vals[i]);
        if (Number.isFinite(parsed)) todaySecondsByUserId.set(id, Math.max(0, Math.floor(parsed)));
      });
    } catch (err) {
      console.warn("[room-boards] todaySeconds read failed; using minutes fallback", err);
    }
  }

  return rooms.map((room) => ({
    id: room.id,
    roomName: room.name,
    roomCode: room.code,
    members: room.members.map((member) => {
      const displayName = member.user.name ?? "Unknown";
      const live = liveByUserId?.get(member.user.id);
      return {
        id: member.user.id,
        name: displayName,
        initials: initialsFromName(displayName),
        image: member.user.image,
        active: Boolean(live),
        startedAtIso: live?.startedAt ?? new Date(0).toISOString(),
        todayMinutes: todayMinutesByUserId.get(member.user.id) ?? 0,
        todaySeconds: todaySecondsByUserId.get(member.user.id) ?? 0,
      };
    }),
  }));
}
