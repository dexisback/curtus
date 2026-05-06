import { NextResponse } from 'next/server';
import { requireApiSession, withApi } from '@/lib/api-session';
import { prisma } from '@/lib/db';
import { getStudyDayStart } from '@/lib/periods';

type Params = { params: Promise<{ id: string }> };

export const GET = withApi(async (_request: Request, { params }: Params) => {
  await requireApiSession();
  const { id: userId } = await params;

  const todayStart = getStudyDayStart(new Date());
  const start = new Date(todayStart.getTime() - 34 * 86_400_000);
  const end = new Date(todayStart.getTime() + 86_400_000);

  const rows = await prisma.dailyStats.findMany({
    where: {
      userId,
      date: { gte: start, lt: end },
    },
    orderBy: { date: 'asc' },
    select: { date: true, totalMinutes: true },
  });

  const byIso = new Map(
    rows.map((row) => [row.date.toISOString().slice(0, 10), row.totalMinutes]),
  );
  const days = Array.from({ length: 35 }, (_, index) => {
    const date = new Date(start.getTime() + index * 86_400_000);
    const iso = date.toISOString().slice(0, 10);
    return {
      date: iso,
      totalMinutes: byIso.get(iso) ?? 0,
    };
  });

  return NextResponse.json({ days });
});
