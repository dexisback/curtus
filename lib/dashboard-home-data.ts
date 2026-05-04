import { cache } from "react";
import { prisma } from "@/lib/db";
import { ROOM_BOARD_MEMBER_PREVIEW_LIMIT } from "@/lib/dashboard-room";
import { getStudyDayStart } from "@/lib/periods";

function initialsFromName(displayName: string) {
  const parts = displayName.trim().split(/\s+/);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Room boards + todo strip for `/dashboard`; cached per request. */
export const getDashboardHomeData = cache(async (userId: string) => {
  const todayStart = getStudyDayStart(new Date());

  const [tasks, membershipRooms] = await Promise.all([
    prisma.task.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 24,
      select: {
        id: true,
        title: true,
        type: true,
        isCompleted: true,
      },
    }),
    prisma.roomMember.findMany({
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
    }),
  ]);

  const memberIds = Array.from(
    new Set(membershipRooms.flatMap((m) => m.room.members.map((mem) => mem.user.id))),
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

  const boards = membershipRooms.map(({ room }) => ({
    id: room.id,
    roomName: room.name,
    roomCode: room.code,
    members: room.members.map((member) => {
      const displayName = member.user.name ?? "Unknown";
      return {
        id: member.user.id,
        name: displayName,
        initials: initialsFromName(displayName),
        image: member.user.image,
        active: false,
        startedAtIso: new Date().toISOString(),
        todayMinutes: todayMinutesByUserId.get(member.user.id) ?? 0,
      };
    }),
  }));

  return { tasks, boards };
});
