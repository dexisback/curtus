import { NextResponse } from "next/server";
import { verifyQStash } from "@/lib/jobs/auth";
import { redis } from "@/lib/redis";
import { prisma } from "@/lib/db";
import { getStudyDayStart } from "@/lib/periods";
import { bumpLeaderboards } from "@/lib/leaderboard";
import { logger } from "@/lib/logger";

const MAX_SESSION_HOURS = 4;

export async function POST(req: Request) {
  try {
    await verifyQStash(req);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!redis) {
    return NextResponse.json({ ok: true, skipped: "redis_unavailable" });
  }

  const cutoff = new Date(Date.now() - MAX_SESSION_HOURS * 60 * 60 * 1_000);
  let cursor = 0;
  let reconciled = 0;

  do {
    const [nextCursor, keys] = await redis.scan(cursor, {
      match: "user:*:liveSession",
      count: 100,
    });
    cursor = Number(nextCursor);

    for (const key of keys) {
      const raw = await redis.get<{ startedAt: string; roomId: string | null }>(key);
      if (!raw) continue;

      const startedAt = new Date(raw.startedAt);
      if (startedAt >= cutoff) continue;

      const claimed = await redis.getdel<{ startedAt: string; roomId: string | null }>(key);
      if (!claimed) continue;

      const completedAt = new Date(
        Math.min(
          Date.now(),
          startedAt.getTime() + MAX_SESSION_HOURS * 60 * 60 * 1_000,
        ),
      );
      const durationMin = Math.max(
        1,
        Math.floor((completedAt.getTime() - startedAt.getTime()) / 60_000),
      );
      const studyDayStart = getStudyDayStart(completedAt);

      const userId = key.split(":")[1];
      if (!userId) continue;

      try {
        await prisma.$transaction([
          prisma.focusSession.create({
            data: { userId, roomId: claimed.roomId ?? null, durationMin, completedAt },
          }),
          prisma.user.update({
            where: { id: userId },
            data: { lifetimeFocusMinutes: { increment: durationMin } },
          }),
          prisma.dailyStats.upsert({
            where: { userId_date: { userId, date: studyDayStart } },
            update: { totalMinutes: { increment: durationMin } },
            create: { userId, date: studyDayStart, totalMinutes: durationMin },
          }),
        ]);

        await bumpLeaderboards(userId, durationMin, completedAt);
        reconciled++;
        logger.info("Reconciled stale session", { userId, durationMin });
      } catch (err) {
        logger.error("Failed to reconcile session", {
          userId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  } while (cursor !== 0);

  return NextResponse.json({ ok: true, reconciled });
}

// — QStash job: reconcile orphaned or stale live sessions in Redis.
