import { requireSession } from '@/lib/session';
import { prisma } from '@/lib/db';
import { getStudyDayStart, getWeekStart, getMonthStart } from '@/lib/periods';
import SessionsLoadMore from '@/components/sessions-load-more';
import { CalendarDays, Video } from 'lucide-react';
import FriendsPanel, {
  type FriendItem,
} from '@/components/profile/friends-panel';
import ProfileHeaderEditor from '@/components/profile/profile-header-editor';
import {
  formatMinutesClock,
  formatMinutesCompact,
} from '@/lib/study-time-format';

function formatMin(min: number): string {
  return formatMinutesCompact(min);
}

export default async function ProfilePage() {
  const session = await requireSession();
  const userId = session.user.id;
  const now = new Date();

  const todayStart = getStudyDayStart(now);
  const weekStart = getWeekStart(now);
  const monthStart = getMonthStart(now);
  const sevenDaysAgo = new Date(todayStart.getTime() - 6 * 86_400_000);
  const thirtyFiveDaysAgo = new Date(todayStart.getTime() - 34 * 86_400_000);

  const nextDay = new Date(todayStart.getTime() + 86_400_000);
  const nextWeek = new Date(weekStart.getTime() + 7 * 86_400_000);
  const nextMonth = new Date(
    monthStart.getFullYear(),
    monthStart.getMonth() + 1,
    1,
    monthStart.getHours(),
    0,
    0,
    0,
  );

  let user: {
    name: string | null;
    image: string | null;
    email: string | null;
    lifetimeFocusMinutes: number;
    createdAt: Date;
  } | null = null;
  let streakRow: { currentStreak: number; longestStreak: number } | null = null;
  let todayAgg: { _sum: { totalMinutes: number | null } } = {
    _sum: { totalMinutes: 0 },
  };
  let weekAgg: { _sum: { totalMinutes: number | null } } = {
    _sum: { totalMinutes: 0 },
  };
  let monthAgg: { _sum: { totalMinutes: number | null } } = {
    _sum: { totalMinutes: 0 },
  };
  let last7DaysRows: { date: Date; totalMinutes: number }[] = [];
  let last35DaysRows: { date: Date; totalMinutes: number }[] = [];
  let recentSessions: {
    id: string;
    durationMin: number;
    completedAt: Date;
    room: { code: string; name: string } | null;
  }[] = [];
  let relatedRoomMemberships: {
    room: { members: { user: { id: string; name: string | null } }[] };
  }[] = [];
  let pingRows: {
    createdAt: Date;
    fromUserId: string;
    toUserId: string;
    fromUser: {
      id: string;
      name: string | null;
      image: string | null;
      email: string | null;
    };
    toUser: {
      id: string;
      name: string | null;
      image: string | null;
      email: string | null;
    };
  }[] = [];

  try {
    [
      user,
      streakRow,
      todayAgg,
      weekAgg,
      monthAgg,
      last7DaysRows,
      last35DaysRows,
      recentSessions,
      relatedRoomMemberships,
      pingRows,
    ] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          name: true,
          image: true,
          email: true,
          lifetimeFocusMinutes: true,
          createdAt: true,
        },
      }),
      prisma.streak.findUnique({
        where: { userId },
        select: { currentStreak: true, longestStreak: true },
      }),
      prisma.dailyStats.aggregate({
        where: { userId, date: { gte: todayStart, lt: nextDay } },
        _sum: { totalMinutes: true },
      }),
      prisma.dailyStats.aggregate({
        where: { userId, date: { gte: weekStart, lt: nextWeek } },
        _sum: { totalMinutes: true },
      }),
      prisma.dailyStats.aggregate({
        where: { userId, date: { gte: monthStart, lt: nextMonth } },
        _sum: { totalMinutes: true },
      }),
      prisma.dailyStats.findMany({
        where: { userId, date: { gte: sevenDaysAgo, lte: todayStart } },
        orderBy: { date: 'asc' },
        select: { date: true, totalMinutes: true },
      }),
      prisma.dailyStats.findMany({
        where: { userId, date: { gte: thirtyFiveDaysAgo, lte: todayStart } },
        orderBy: { date: 'asc' },
        select: { date: true, totalMinutes: true },
      }),
      prisma.focusSession.findMany({
        where: { userId },
        orderBy: { completedAt: 'desc' },
        take: 20,
        select: {
          id: true,
          durationMin: true,
          completedAt: true,
          room: { select: { code: true, name: true } },
        },
      }),
      prisma.roomMember.findMany({
        where: { userId },
        select: {
          room: {
            select: {
              members: {
                select: { user: { select: { id: true, name: true } } },
              },
            },
          },
        },
        take: 8,
      }),
      prisma.ping.findMany({
        where: {
          OR: [{ fromUserId: userId }, { toUserId: userId }],
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
        select: {
          createdAt: true,
          fromUserId: true,
          toUserId: true,
          fromUser: {
            select: { id: true, name: true, image: true, email: true },
          },
          toUser: {
            select: { id: true, name: true, image: true, email: true },
          },
        },
      }),
    ]);
  } catch (err) {
    console.warn(
      '[profile] failed to load profile aggregates; rendering fallbacks',
      err,
    );
  }

  // Build a 7-slot strip with zero-fill for missing days
  const last7Days: { date: string; totalMinutes: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(sevenDaysAgo.getTime() + i * 86_400_000);
    const iso = d.toISOString().slice(0, 10);
    const row = last7DaysRows.find(
      (r) => r.date.toISOString().slice(0, 10) === iso,
    );
    last7Days.push({ date: iso, totalMinutes: row?.totalMinutes ?? 0 });
  }

  const maxMin = Math.max(...last7Days.map((d) => d.totalMinutes), 1);

  const today = todayAgg._sum.totalMinutes ?? 0;
  const thisWeek = weekAgg._sum.totalMinutes ?? 0;
  const thisMonth = monthAgg._sum.totalMinutes ?? 0;
  const lifetime = user?.lifetimeFocusMinutes ?? 0;

  const STATS = [
    { label: 'Today', value: formatMin(today) },
    { label: 'This Week', value: formatMin(thisWeek) },
    { label: 'This Month', value: formatMin(thisMonth) },
    { label: 'Lifetime', value: formatMin(lifetime) },
    { label: 'Current Streak', value: `${streakRow?.currentStreak ?? 0}d` },
    { label: 'Longest Streak', value: `${streakRow?.longestStreak ?? 0}d` },
  ];

  const uniqueRooms = Array.from(
    new Set(recentSessions.map((s) => s.room?.name).filter(Boolean)),
  ).slice(0, 6) as string[];
  const collaboratorCandidates = relatedRoomMemberships.flatMap((membership) =>
    membership.room.members
      .map((member) => member.user)
      .filter((member) => member.id !== userId && member.name),
  );
  const collaboratorsMap = new Map<string, string>();
  for (const collaborator of collaboratorCandidates) {
    if (!collaboratorsMap.has(collaborator.id)) {
      collaboratorsMap.set(collaborator.id, collaborator.name as string);
    }
  }
  const collaborators = Array.from(collaboratorsMap.values()).slice(0, 4);
  const friendsMap = new Map<string, FriendItem>();
  for (const row of pingRows) {
    const other = row.fromUserId === userId ? row.toUser : row.fromUser;
    if (!other || friendsMap.has(other.id)) continue;
    friendsMap.set(other.id, {
      id: other.id,
      name: other.name ?? 'Unknown',
      email: other.email ?? '',
      image: other.image ?? null,
      connectedAt: row.createdAt.toISOString(),
    });
  }
  const initialFriends = Array.from(friendsMap.values()).slice(0, 8);

  const last35Map = new Map(
    last35DaysRows.map((row) => [
      row.date.toISOString().slice(0, 10),
      row.totalMinutes,
    ]),
  );
  const heatmap = Array.from({ length: 35 }, (_, i) => {
    const d = new Date(thirtyFiveDaysAgo.getTime() + i * 86_400_000);
    const iso = d.toISOString().slice(0, 10);
    return last35Map.get(iso) ?? 0;
  });
  const heatmapMax = Math.max(1, ...heatmap);

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-y-auto px-4 pb-8 pt-2 sm:px-6">
      <div className="mx-auto w-full max-w-5xl space-y-5 pt-2">
        {/* ── Header tile ── */}
        <ProfileHeaderEditor
          initialName={user?.name ?? 'Unknown'}
          initialEmail={user?.email ?? ''}
          initialImage={user?.image ?? null}
          joinedLabel={new Date(user?.createdAt ?? now).toLocaleDateString()}
        />

        {/* ── User stats (single surface) ── */}
        <div
          className="bg-[color:var(--panel-texture-bg)] bg-[image:var(--panel-texture-image)] bg-[length:200px_200px] rounded-2xl border border-border/50 p-5
            shadow-[0_1px_2px_rgba(17,24,39,0.04),0_6px_18px_rgba(17,24,39,0.07),inset_0_1px_0_rgba(255,255,255,0.5)]"
        >
          <p className="mb-4 text-[12px] font-semibold tracking-tight text-foreground">
            User stats
          </p>
          <div className="grid grid-cols-1 divide-y divide-border/40 rounded-xl border border-border/50 bg-background/75 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-3">
            {STATS.map(({ label, value }) => (
              <div key={label} className="px-4 py-3">
                <p className="text-[10.5px] text-muted-foreground">{label}</p>
                <p className="mt-0.5 text-[22px] font-semibold tabular-nums tracking-tight text-foreground">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_1fr]">
          {/* ── Calendar-style heatmap ── */}
          <div
            className="bg-[color:var(--panel-texture-bg)] bg-[image:var(--panel-texture-image)] bg-[length:200px_200px] rounded-2xl border border-border/50 p-5
              shadow-[0_1px_2px_rgba(17,24,39,0.04),0_6px_18px_rgba(17,24,39,0.07),inset_0_1px_0_rgba(255,255,255,0.5)]"
          >
            <p className="mb-3 flex items-center gap-2 text-[12px] font-semibold text-foreground">
              <CalendarDays size={13} />
              Study calendar
            </p>
            <div className="grid grid-cols-7 gap-1.5">
              {heatmap.map((minutes, i) => {
                const opacity = Math.max(
                  0.08,
                  Math.min(0.95, minutes / heatmapMax),
                );
                const date = new Date(
                  thirtyFiveDaysAgo.getTime() + i * 86_400_000,
                );
                const iso = date.toISOString().slice(0, 10);
                return (
                  <div
                    key={i}
                    title={`${iso}: ${formatMinutesCompact(minutes)} (${formatMinutesClock(minutes)})`}
                    className="aspect-square rounded-[4px] border border-border/40 bg-cta"
                    style={{ opacity }}
                  />
                );
              })}
            </div>
            <div className="mt-2 grid grid-cols-7 text-center text-[9px] text-muted-foreground">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(
                (label) => (
                  <span key={label}>{label}</span>
                ),
              )}
            </div>
            <div
              className="mt-3 flex items-end gap-2"
              style={{ height: '82px' }}
            >
              {last7Days.map(({ date, totalMinutes }) => {
                const barH = Math.max(
                  4,
                  Math.round((totalMinutes / maxMin) * 64),
                );
                const dayLabel = new Date(date + 'T12:00:00Z')
                  .toLocaleDateString(undefined, { weekday: 'short' })
                  .slice(0, 2);
                return (
                  <div
                    key={date}
                    className="flex flex-1 flex-col items-center gap-1"
                  >
                    <div className="relative flex w-full flex-1 items-end">
                      <div
                        className="w-full rounded-sm bg-cta/70 transition-[height] duration-300"
                        style={{ height: `${barH}px` }}
                        title={`${date}: ${formatMinutesCompact(totalMinutes)} (${formatMinutesClock(totalMinutes)})`}
                      />
                    </div>
                    <span className="tabular-nums text-[10px] text-muted-foreground">
                      {dayLabel}
                    </span>
                    <span className="tabular-nums text-[9px] text-muted-foreground/85">
                      {formatMinutesClock(totalMinutes)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Friends + rooms ── */}
          <div className="space-y-4">
            <FriendsPanel
              initialFriends={initialFriends}
              fallbackNames={collaborators}
            />
            <div className="bg-[color:var(--panel-texture-bg)] bg-[image:var(--panel-texture-image)] bg-[length:200px_200px] rounded-2xl border border-border/50 p-4">
              <p className="mb-3 flex items-center gap-2 text-[12px] font-semibold text-foreground">
                <Video size={13} />
                Rooms
              </p>
              <div className="space-y-2">
                {uniqueRooms.length > 0 ? (
                  uniqueRooms.map((roomName) => (
                    <div
                      key={roomName}
                      className="flex items-center justify-between rounded-lg border border-border/50 bg-background/80 px-3 py-2"
                    >
                      <span className="text-[11.5px] text-foreground">
                        {roomName}
                      </span>
                      <button className="rounded-[6px] bg-cta px-2 py-1 text-[10px] font-medium text-cta-foreground">
                        Manage
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    No room history yet.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Recent sessions ── */}
        <div
          className="bg-[color:var(--panel-texture-bg)] bg-[image:var(--panel-texture-image)] bg-[length:200px_200px] rounded-2xl border border-border/50 p-5
            shadow-[0_1px_2px_rgba(17,24,39,0.04),0_6px_18px_rgba(17,24,39,0.07),inset_0_1px_0_rgba(255,255,255,0.5)]"
        >
          <p className="mb-4 text-[12px] font-semibold text-foreground">
            Recent sessions
          </p>
          <SessionsLoadMore
            initialItems={recentSessions.map((s) => ({
              id: s.id,
              durationMin: s.durationMin,
              completedAt: s.completedAt.toISOString(),
              roomCode: s.room?.code ?? null,
              roomName: s.room?.name ?? null,
            }))}
            initialNextCursor={
              recentSessions.length >= 20
                ? (recentSessions[recentSessions.length - 1]?.id ?? null)
                : null
            }
          />
        </div>
      </div>
    </div>
  );
}

// — Profile page: header editor, friends, stats.
