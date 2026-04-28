import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import {
  getStudyDayStart,
  getWeekStart,
  getMonthStart,
} from "@/lib/periods";
import SessionsLoadMore from "@/components/sessions-load-more";
import { CalendarDays, Users, Video } from "lucide-react";

function formatMin(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default async function ProfilePage() {
  const session = await requireSession();
  const userId = session.user.id;
  const now = new Date();

  const todayStart = getStudyDayStart(now);
  const weekStart = getWeekStart(now);
  const monthStart = getMonthStart(now);
  const sevenDaysAgo = new Date(todayStart.getTime() - 6 * 86_400_000);

  const nextDay = new Date(todayStart.getTime() + 86_400_000);
  const nextWeek = new Date(weekStart.getTime() + 7 * 86_400_000);
  const nextMonth = new Date(
    Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 1, 5),
  );

  const [
    user,
    streakRow,
    todayAgg,
    weekAgg,
    monthAgg,
    last7DaysRows,
    recentSessions,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, image: true, email: true, lifetimeFocusMinutes: true, createdAt: true },
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
      orderBy: { date: "asc" },
      select: { date: true, totalMinutes: true },
    }),
    prisma.focusSession.findMany({
      where: { userId },
      orderBy: { completedAt: "desc" },
      take: 20,
      select: {
        id: true,
        durationMin: true,
        completedAt: true,
        room: { select: { code: true, name: true } },
      },
    }),
  ]);

  // Build a 7-slot strip with zero-fill for missing days
  const last7Days: { date: string; totalMinutes: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(sevenDaysAgo.getTime() + i * 86_400_000);
    const iso = d.toISOString().slice(0, 10);
    const row = last7DaysRows.find((r) => r.date.toISOString().slice(0, 10) === iso);
    last7Days.push({ date: iso, totalMinutes: row?.totalMinutes ?? 0 });
  }

  const maxMin = Math.max(...last7Days.map((d) => d.totalMinutes), 1);

  const today = todayAgg._sum.totalMinutes ?? 0;
  const thisWeek = weekAgg._sum.totalMinutes ?? 0;
  const thisMonth = monthAgg._sum.totalMinutes ?? 0;
  const lifetime = user?.lifetimeFocusMinutes ?? 0;

  const STATS = [
    { label: "Today", value: formatMin(today) },
    { label: "This Week", value: formatMin(thisWeek) },
    { label: "This Month", value: formatMin(thisMonth) },
    { label: "Lifetime", value: formatMin(lifetime) },
    { label: "Current Streak", value: `${streakRow?.currentStreak ?? 0}d` },
    { label: "Longest Streak", value: `${streakRow?.longestStreak ?? 0}d` },
  ];

  const initials = user?.name
    ? user.name
        .trim()
        .split(/\s+/)
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";
  const uniqueRooms = Array.from(
    new Set(recentSessions.map((s) => s.room?.name).filter(Boolean)),
  ).slice(0, 6) as string[];
  const friends = ["Sarah K.", "Dev P.", "Meera R.", "Omar S."];

  const heatmap = Array.from({ length: 35 }, (_, i) => {
    const base = last7Days[i % last7Days.length]?.totalMinutes ?? 0;
    const jitter = (i * 7) % 22;
    return Math.min(180, base + jitter);
  });

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-y-auto px-4 pb-8 pt-2 sm:px-6">
      <div className="mx-auto w-full max-w-4xl space-y-5 pt-2">
        {/* ── Header tile ── */}
        <div
          className="bg-[color:var(--panel-texture-bg)] bg-[image:var(--panel-texture-image)] bg-[length:200px_200px] flex items-center gap-4 rounded-2xl border border-border/50 p-5
            shadow-[0_1px_2px_rgba(17,24,39,0.04),0_6px_18px_rgba(17,24,39,0.07),inset_0_1px_0_rgba(255,255,255,0.5)]"
        >
          {user?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.image}
              alt=""
              className="h-14 w-14 shrink-0 rounded-2xl object-cover [outline:1px_solid_rgba(0,0,0,0.07)]"
            />
          ) : (
            <div
              className="flex h-14 w-14 shrink-0 select-none items-center justify-center rounded-2xl text-sm font-semibold text-white
                [outline:1px_solid_rgba(0,0,0,0.06)]"
              style={{ background: "oklch(0.62 0.06 75)" }}
            >
              {initials}
            </div>
          )}
          <div>
            <p className="text-base font-semibold tracking-tight text-foreground">
              {user?.name ?? "Unknown"}
            </p>
            <p className="mt-0.5 text-[12px] text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {STATS.map(({ label, value }) => (
            <div
              key={label}
              className="bg-[color:var(--panel-texture-bg)] bg-[image:var(--panel-texture-image)] bg-[length:200px_200px] flex flex-col gap-1 rounded-xl border border-border/50 p-4
                shadow-[0_1px_2px_rgba(17,24,39,0.04),0_4px_12px_rgba(17,24,39,0.06),inset_0_1px_0_rgba(255,255,255,0.5)]"
            >
              <p className="text-[10.5px] text-muted-foreground">{label}</p>
              <p className="text-xl font-semibold tabular-nums text-foreground">{value}</p>
            </div>
          ))}
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
                const opacity = Math.max(0.08, Math.min(0.95, minutes / 180));
                return (
                  <div
                    key={i}
                    title={`${minutes}m`}
                    className="aspect-square rounded-[4px] border border-border/40 bg-cta"
                    style={{ opacity }}
                  />
                );
              })}
            </div>
            <div className="mt-3 flex items-end gap-2" style={{ height: "82px" }}>
              {last7Days.map(({ date, totalMinutes }) => {
                const barH = Math.max(4, Math.round((totalMinutes / maxMin) * 64));
                const dayLabel = new Date(date + "T12:00:00Z")
                  .toLocaleDateString(undefined, { weekday: "short" })
                  .slice(0, 2);
                return (
                  <div key={date} className="flex flex-1 flex-col items-center gap-1">
                    <div className="relative flex w-full flex-1 items-end">
                      <div
                        className="w-full rounded-sm bg-cta/70 transition-[height] duration-300"
                        style={{ height: `${barH}px` }}
                        title={`${date}: ${formatMin(totalMinutes)}`}
                      />
                    </div>
                    <span className="tabular-nums text-[10px] text-muted-foreground">{dayLabel}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Friends + rooms ── */}
          <div className="space-y-4">
            <div className="bg-[color:var(--panel-texture-bg)] bg-[image:var(--panel-texture-image)] bg-[length:200px_200px] rounded-2xl border border-border/50 p-4">
              <p className="mb-3 flex items-center gap-2 text-[12px] font-semibold text-foreground">
                <Users size={13} />
                Friends
              </p>
              <div className="space-y-2">
                {friends.map((friend) => (
                  <div key={friend} className="flex items-center justify-between rounded-lg border border-border/50 bg-background/80 px-3 py-2">
                    <span className="text-[11.5px] text-foreground">{friend}</span>
                    <span className="text-[10px] text-muted-foreground">online</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-[color:var(--panel-texture-bg)] bg-[image:var(--panel-texture-image)] bg-[length:200px_200px] rounded-2xl border border-border/50 p-4">
              <p className="mb-3 flex items-center gap-2 text-[12px] font-semibold text-foreground">
                <Video size={13} />
                Rooms
              </p>
              <div className="space-y-2">
                {uniqueRooms.length > 0 ? uniqueRooms.map((roomName) => (
                  <div key={roomName} className="flex items-center justify-between rounded-lg border border-border/50 bg-background/80 px-3 py-2">
                    <span className="text-[11.5px] text-foreground">{roomName}</span>
                    <button className="rounded-md bg-cta px-2 py-1 text-[10px] font-medium text-cta-foreground">Manage</button>
                  </div>
                )) : (
                  <p className="text-[11px] text-muted-foreground">No room history yet.</p>
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
          <p className="mb-4 text-[12px] font-semibold text-foreground">Recent sessions</p>
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
