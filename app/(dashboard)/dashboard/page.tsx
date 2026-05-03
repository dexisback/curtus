import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getStudyDayStart } from "@/lib/periods";
import VideoPlayerWrapper from "@/features/dashboard/components/video-player-wrapper";
import Leaderboard from "@/features/dashboard/components/leaderboard";
import TodoComponent from "@/features/dashboard/components/todo-component";

export default async function DashboardPage() {
  const session = await requireSession();
  const todayStart = getStudyDayStart(new Date());
  const [tasks, membershipRooms] = await Promise.all([
    prisma.task.findMany({
      where: { userId: session.user.id },
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
      where: { userId: session.user.id },
      orderBy: { joinedAt: "desc" },
      take: 6,
      select: {
        room: {
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
        },
      },
    }),
  ]);

  const memberIds = Array.from(
    new Set(
      membershipRooms.flatMap((membership) =>
        membership.room.members.map((member) => member.user.id),
      ),
    ),
  );
  const crossTodayRows = memberIds.length
    ? await prisma.dailyStats.findMany({
        where: {
          userId: { in: memberIds },
          date: todayStart,
        },
        select: { userId: true, totalMinutes: true },
      })
    : [];
  const todayMinutesByUserId = new Map(
    crossTodayRows.map((row) => [row.userId, row.totalMinutes]),
  );
  const boards = membershipRooms.map(({ room }) => ({
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
    <div
      id="focus"
      tabIndex={-1}
      className="flex h-full min-h-0 w-full flex-col gap-6 overflow-hidden px-5 pb-5 pt-10 sm:gap-8 sm:px-6 sm:pb-6 sm:pt-12 md:gap-10 scroll-mt-6"
    >
      {/* Top bento: ~38% leaderboard (left) + ~62% video (right) */}
      <div className="grid min-h-0 min-w-0 flex-1 grid-cols-[minmax(0,1.9fr)_minmax(0,3.1fr)] gap-6 sm:gap-7 md:gap-8">
        <Leaderboard boards={boards} />
        <VideoPlayerWrapper />
      </div>

      {/* Bottom todo/calendar strip */}
      <div className="h-[25%] min-h-[9.5rem] shrink-0">
        <TodoComponent
          initialTasks={tasks.map((task) => ({
            id: task.id,
            title: task.title,
            type: task.type,
            isCompleted: task.isCompleted,
          }))}
        />
      </div>
    </div>
  );
}

// — Dashboard home server page; passes session into client widgets.
