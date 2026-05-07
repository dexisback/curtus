import { NextResponse } from 'next/server';
import { verifyQStash } from '@/lib/jobs/auth';
import { redis } from '@/lib/redis';
import { prisma } from '@/lib/db';
import {
  type Period,
  getStudyDayStart,
  getWeekStart,
  getMonthStart,
  getPeriodTtlSeconds,
} from '@/lib/periods';
import { logger } from '@/lib/logger';
import { withObservedSpan } from '@/lib/observability';

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({
    request_id: requestId,
    event_name: 'job.rebuild_leaderboards',
  });
  return withObservedSpan(
    'job.rebuild_leaderboards',
    {
      'http.method': 'POST',
      'http.route': '/api/jobs/rebuild-leaderboards',
      request_id: requestId,
    },
    async () => {
      try {
        await verifyQStash(req);
      } catch {
        log.warn('Rejected rebuild leaderboards job', {
          error_code: 'UNAUTHORIZED',
        });
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      if (!redis) {
        log.warn('Skipped rebuild leaderboards', {
          error_code: 'REDIS_UNAVAILABLE',
        });
        return NextResponse.json({ ok: true, skipped: 'redis_unavailable' });
      }

      const now = new Date();
      const periods: Period[] = ['daily', 'weekly', 'monthly'];
      const rebuilt: Record<string, number> = {};

      for (const period of periods) {
        try {
          let dateStart: Date;
          const dateEnd: Date = now;

          if (period === 'daily') {
            dateStart = getStudyDayStart(now);
          } else if (period === 'weekly') {
            dateStart = getWeekStart(now);
          } else {
            dateStart = getMonthStart(now);
          }

          const rows = await prisma.dailyStats.groupBy({
            by: ['userId'],
            where: { date: { gte: dateStart, lte: dateEnd } },
            _sum: { totalMinutes: true },
            orderBy: { _sum: { totalMinutes: 'desc' } },
            take: 500,
          });

          if (rows.length === 0) {
            rebuilt[period] = 0;
            continue;
          }

          let canonicalKey: string;
          if (period === 'daily') {
            canonicalKey = `lb:daily:${dateStart.toISOString().slice(0, 10)}`;
          } else if (period === 'weekly') {
            canonicalKey = `lb:weekly:${dateStart.toISOString().slice(0, 10)}`;
          } else {
            canonicalKey = `lb:monthly:${dateStart.toISOString().slice(0, 7)}`;
          }
          const tmpKey = `${canonicalKey}:rebuild`;

          const pipeline = redis.pipeline();
          pipeline.del(tmpKey);
          for (const row of rows) {
            pipeline.zadd(tmpKey, {
              score: row._sum.totalMinutes ?? 0,
              member: row.userId,
            });
          }
          pipeline.rename(tmpKey, canonicalKey);
          pipeline.expire(canonicalKey, getPeriodTtlSeconds(period, now));
          await pipeline.exec();

          rebuilt[period] = rows.length;
          log.info('Rebuilt leaderboard', { period, entries: rows.length });
        } catch (err) {
          log.error('Failed to rebuild leaderboard', {
            period,
            error_code: 'LEADERBOARD_REBUILD_FAILED',
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      return NextResponse.json({ ok: true, rebuilt });
    },
  );
}

// — QStash job: rebuild Redis leaderboard ZSETs from DB.
