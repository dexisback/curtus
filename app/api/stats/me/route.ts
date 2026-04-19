import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import {
  getStudyDayStart,
  getWeekStart,
  getMonthStart,
} from "@/lib/periods";

export async function GET() {
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
      select: { lifetimeFocusMinutes: true, name: true, image: true },
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

  // Fill in zero-minute days for the last-7-days strip
  const last7Days: { date: string; totalMinutes: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(sevenDaysAgo.getTime() + i * 86_400_000);
    const iso = d.toISOString().slice(0, 10);
    const row = last7DaysRows.find((r) => r.date.toISOString().slice(0, 10) === iso);
    last7Days.push({ date: iso, totalMinutes: row?.totalMinutes ?? 0 });
  }

  return NextResponse.json({
    name: user?.name ?? null,
    image: user?.image ?? null,
    lifetimeFocusMinutes: user?.lifetimeFocusMinutes ?? 0,
    today: todayAgg._sum.totalMinutes ?? 0,
    thisWeek: weekAgg._sum.totalMinutes ?? 0,
    thisMonth: monthAgg._sum.totalMinutes ?? 0,
    last7Days,
    recentSessions: recentSessions.map((s) => ({
      id: s.id,
      durationMin: s.durationMin,
      completedAt: s.completedAt.toISOString(),
      roomCode: s.room?.code ?? null,
      roomName: s.room?.name ?? null,
    })),
  });
}
