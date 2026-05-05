import { NextResponse } from "next/server";
import { requireApiSession, withApi } from "@/lib/api-session";
import { limiters, enforce } from "@/lib/ratelimit";
import { prisma } from "@/lib/db";
import { readTodaySeconds } from "@/lib/study-live-session";
import {
  getStudyDayStart,
  getWeekStart,
  getMonthStart,
} from "@/lib/periods";

//returns lifetime, today/week/month totals, 7-day strip, last 10 sessions
export const GET = withApi(async () => {
  const session = await requireApiSession();
  await enforce(limiters.statsRead, session.user.id);
  const userId = session.user.id;
  const now = new Date();

  const todayStart = getStudyDayStart(now);
  const weekStart = getWeekStart(now);
  const monthStart = getMonthStart(now);
  const sevenDaysAgo = new Date(todayStart.getTime() - 6 * 86_400_000);

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
  let user: { lifetimeFocusMinutes: number; name: string | null; image: string | null } | null = null;
  let streak: { currentStreak: number; longestStreak: number; lastActiveDate: Date | null } | null = null;
  let todayAgg: { _sum: { totalMinutes: number | null } } = { _sum: { totalMinutes: 0 } };
  let weekAgg: { _sum: { totalMinutes: number | null } } = { _sum: { totalMinutes: 0 } };
  let monthAgg: { _sum: { totalMinutes: number | null } } = { _sum: { totalMinutes: 0 } };
  let last7DaysRows: { date: Date; totalMinutes: number }[] = [];
  let recentSessions: {
    id: string;
    durationMin: number;
    completedAt: Date;
    room: { code: string; name: string } | null;
  }[] = [];

  try {
    [
      user,
      streak,
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
      prisma.streak.findUnique({
        where: { userId },
        select: { currentStreak: true, longestStreak: true, lastActiveDate: true },
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
  } catch (err) {
    console.warn("[stats/me] failed to load aggregates; returning safe defaults", err);
  }

  // Fill in zero-minute days for the last-7-days strip
  const last7Days: { date: string; totalMinutes: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(sevenDaysAgo.getTime() + i * 86_400_000);
    const iso = d.toISOString().slice(0, 10);
    const row = last7DaysRows.find((r) => r.date.toISOString().slice(0, 10) === iso);
    last7Days.push({ date: iso, totalMinutes: row?.totalMinutes ?? 0 });
  }

  const todaySeconds = await readTodaySeconds(userId);

  return NextResponse.json({
    name: user?.name ?? null,
    image: user?.image ?? null,
    lifetimeFocusMinutes: user?.lifetimeFocusMinutes ?? 0,
    streak: streak
      ? {
          currentStreak: streak.currentStreak,
          longestStreak: streak.longestStreak,
          lastActiveDate: streak.lastActiveDate?.toISOString() ?? null,
        }
      : { currentStreak: 0, longestStreak: 0, lastActiveDate: null },
    today: todayAgg._sum.totalMinutes ?? 0,
    todaySeconds,
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
});

// — GET: aggregates (focus minutes, streak) for dashboard.
