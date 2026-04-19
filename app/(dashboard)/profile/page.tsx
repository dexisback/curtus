import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import {
  getStudyDayStart,
  getWeekStart,
  getMonthStart,
} from "@/lib/periods";
import Link from "next/link";

function formatMin(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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
      take: 10,
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

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        {user?.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.image} alt="" className="w-14 h-14 rounded-full" />
        ) : (
          <div className="w-14 h-14 rounded-full bg-muted" />
        )}
        <div>
          <p className="font-semibold text-lg">{user?.name ?? "Unknown"}</p>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Today", value: formatMin(today) },
          { label: "This Week", value: formatMin(thisWeek) },
          { label: "This Month", value: formatMin(thisMonth) },
          { label: "Lifetime", value: formatMin(lifetime) },
        ].map(({ label, value }) => (
          <div key={label} className="rounded border p-3">
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className="text-xl font-semibold tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      {/* Last-7-days bar chart (CSS only) */}
      <div>
        <p className="text-sm font-medium mb-3">Last 7 days</p>
        <div className="flex items-end gap-2 h-24">
          {last7Days.map(({ date, totalMinutes }) => (
            <div key={date} className="flex flex-col items-center flex-1 gap-1">
              <div
                className="w-full rounded-sm bg-primary/70"
                style={{ height: `${Math.round((totalMinutes / maxMin) * 72)}px` }}
                title={`${date}: ${formatMin(totalMinutes)}`}
              />
              <span className="text-[10px] text-muted-foreground">
                {new Date(date).toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent sessions */}
      <div>
        <p className="text-sm font-medium mb-3">Recent sessions</p>
        {recentSessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sessions logged yet.</p>
        ) : (
          <ul className="space-y-1">
            {recentSessions.map((s) => (
              <li key={s.id} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium tabular-nums">{formatMin(s.durationMin)}</span>
                  {s.room ? (
                    <Link
                      href={`/room/${s.room.code}`}
                      className="text-muted-foreground hover:underline text-xs"
                    >
                      in {s.room.name}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground text-xs">solo</span>
                  )}
                </div>
                <span className="text-muted-foreground text-xs">
                  {formatDate(s.completedAt.toISOString())}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
