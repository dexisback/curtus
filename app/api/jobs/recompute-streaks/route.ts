import { NextResponse } from 'next/server';
import { verifyQStash } from '@/lib/jobs/auth';
import { prisma } from '@/lib/db';
import { getStudyDayStart } from '@/lib/periods';
import { logger } from '@/lib/logger';
import { withObservedSpan } from '@/lib/observability';

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({
    request_id: requestId,
    event_name: 'job.recompute_streaks',
  });
  return withObservedSpan(
    'job.recompute_streaks',
    {
      'http.method': 'POST',
      'http.route': '/api/jobs/recompute-streaks',
      request_id: requestId,
    },
    async () => {
      try {
        await verifyQStash(req);
      } catch {
        log.warn('Rejected recompute streaks job', {
          error_code: 'UNAUTHORIZED',
        });
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const now = new Date();
      const todayStart = getStudyDayStart(now);
      const yesterdayStart = new Date(
        todayStart.getTime() - 24 * 60 * 60 * 1_000,
      );

      const { count } = await prisma.streak.updateMany({
        where: {
          lastActiveDate: { lt: yesterdayStart },
          currentStreak: { gt: 0 },
        },
        data: { currentStreak: 0 },
      });

      log.info('Recomputed streaks', { reset_count: count });
      return NextResponse.json({ ok: true, reset: count });
    },
  );
}

// — QStash job: recompute streak rows from focus history.
