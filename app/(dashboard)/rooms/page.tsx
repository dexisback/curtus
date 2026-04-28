import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { getStudyDayStart } from "@/lib/periods";
import RoomsClient from "./rooms-client";

export default async function RoomsPage() {
  const session = await requireSession();
  const todayStart = getStudyDayStart(new Date());

  const [publicRooms, myMemberships, boardRooms] = await Promise.all([
    prisma.room.findMany({
      where: { isPublic: true },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        code: true,
        name: true,
        host: { select: { id: true, name: true } },
        _count: { select: { members: true } },
      },
    }),
    prisma.roomMember.findMany({
      where: { userId: session.user.id },
      orderBy: { joinedAt: "desc" },
      select: {
        role: true,
        room: {
          select: {
            code: true,
            name: true,
            host: { select: { id: true, name: true } },
            _count: { select: { members: true } },
          },
        },
      },
    }),
    prisma.room.findMany({
      where: {
        OR: [
          { isPublic: true },
          { members: { some: { userId: session.user.id } } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        code: true,
        name: true,
        members: {
          select: {
            user: { select: { id: true, name: true, image: true } },
          },
          orderBy: { joinedAt: "asc" },
        },
      },
    }),
  ]);

  const boardMemberIds = Array.from(
    new Set(
      boardRooms.flatMap((room) => room.members.map((member) => member.user.id)),
    ),
  );
  const todayRows = await prisma.dailyStats.findMany({
    where: {
      userId: { in: boardMemberIds },
      date: todayStart,
    },
    select: { userId: true, totalMinutes: true },
  });
  const todayMinutesByUserId = new Map(
    todayRows.map((row) => [row.userId, row.totalMinutes]),
  );

  const boards = boardRooms.map((room) => ({
    id: room.id,
    roomName: room.name,
    roomCode: room.code,
    members: room.members.map((member) => {
      const displayName = member.user.name ?? "Unknown";
      const parts = displayName.trim().split(/\s+/);
      const initials =
        parts.length === 1
          ? parts[0].slice(0, 2).toUpperCase()
          : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      return {
        id: member.user.id,
        name: displayName,
        initials,
        image: member.user.image,
        active: false,
        startedAtIso: new Date().toISOString(),
        todayMinutes: todayMinutesByUserId.get(member.user.id) ?? 0,
      };
    }),
  }));

  return (
    <RoomsClient
      publicRooms={publicRooms.map((r) => ({
        code: r.code,
        name: r.name,
        memberCount: r._count.members,
        hostName: r.host.name ?? "Unknown",
      }))}
      myRooms={myMemberships.map((m) => ({
        code: m.room.code,
        name: m.room.name,
        role: m.role,
        memberCount: m.room._count.members,
        hostName: m.room.host.name ?? "Unknown",
      }))}
      boards={boards}
    />
  );
}
