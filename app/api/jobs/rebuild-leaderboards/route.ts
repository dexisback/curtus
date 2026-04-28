import { NextResponse } from "next/server";
import { verifyQStash } from "@/lib/jobs/auth";
import { redis } from "@/lib/redis";
import { prisma } from "@/lib/db";
import {
  type Period,
  getStudyDayStart,
  getWeekStart,
  getMonthStart,
  getPeriodTtlSeconds,
} from "@/lib/periods";
import { logger } from "@/lib/logger";

/**
 * POST /api/jobs/rebuild-leaderboards
 * Scheduled by QStash nightly at 04:50 UTC.(to be made to be configurable later on)
 *
 * Recomputes each period's leaderboard from DailyStats and atomically
 * replaces the Redis ZSET. Self-healing if ZINCRBY drift accumulates.
 */
export async function POST(req: Request) {
  try {
    await verifyQStash(req);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!redis) {
    return NextResponse.json({ ok: true, skipped: "redis_unavailable" });
  }

  const now = new Date();
  const periods: Period[] = ["daily", "weekly", "monthly"];
  const rebuilt: Record<string, number> = {};

  for (const period of periods) {
    try {
      let dateStart: Date;
      const dateEnd: Date = now;

      if (period === "daily") {
        dateStart = getStudyDayStart(now);
      } else if (period === "weekly") {
        dateStart = getWeekStart(now);
      } else {
        dateStart = getMonthStart(now);
      }

      const rows = await prisma.dailyStats.groupBy({
        by: ["userId"],
        where: { date: { gte: dateStart, lte: dateEnd } },
        _sum: { totalMinutes: true },
        orderBy: { _sum: { totalMinutes: "desc" } },
        take: 500,
      });

      if (rows.length === 0) {
        rebuilt[period] = 0;
        continue;
      }

      const keyFn = period === "daily"
        ? () => `lb:daily:${dateStart.toISOString().slice(0, 10)}`
        : period === "weekly"
        ? () => `lb:weekly:${dateStart.toISOString().slice(0, 10)}`
        : () => `lb:monthly:${dateStart.toISOString().slice(0, 7)}`;

      const canonicalKey = keyFn();
      const tmpKey = `${canonicalKey}:rebuild`;

      // Write to temp key then rename for atomic swap
      const pipeline = redis.pipeline();
      pipeline.del(tmpKey);
      for (const row of rows) {
        pipeline.zadd(tmpKey, { score: row._sum.totalMinutes ?? 0, member: row.userId });
      }
      pipeline.rename(tmpKey, canonicalKey);
      pipeline.expire(canonicalKey, getPeriodTtlSeconds(period, now));
      await pipeline.exec();

      rebuilt[period] = rows.length;
      logger.info("Rebuilt leaderboard", { period, entries: rows.length });
    } catch (err) {
      logger.error("Failed to rebuild leaderboard", {
        period,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({ ok: true, rebuilt });
}
