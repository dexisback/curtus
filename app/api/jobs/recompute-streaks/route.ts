import { NextResponse } from "next/server";
import { verifyQStash } from "@/lib/jobs/auth";
import { prisma } from "@/lib/db";
import { getStudyDayStart } from "@/lib/periods";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  try {
    await verifyQStash(req);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const todayStart = getStudyDayStart(now);
  const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1_000);

  const { count } = await prisma.streak.updateMany({
    where: {
      lastActiveDate: { lt: yesterdayStart },
      currentStreak: { gt: 0 },
    },
    data: { currentStreak: 0 },
  });

  logger.info("Recomputed streaks", { reset: count });
  return NextResponse.json({ ok: true, reset: count });
}

// — QStash job: recompute streak rows from focus history.
