import { prisma } from "./db.js";
import { getStudyDayStart } from "./periods.js";

export async function bumpStreak(userId: string, completedAt: Date): Promise<void> {
  const today = getStudyDayStart(completedAt);
  const yesterday = new Date(today.getTime() - 86_400_000);

  const existing = await prisma.streak.findUnique({
    where: { userId },
    select: { currentStreak: true, longestStreak: true, lastActiveDate: true },
  });

  if (!existing) {
    await prisma.streak.create({
      data: { userId, currentStreak: 1, longestStreak: 1, lastActiveDate: today },
    });
    return;
  }

  const last = existing.lastActiveDate
    ? getStudyDayStart(existing.lastActiveDate).getTime()
    : null;

  if (last !== null && last === today.getTime()) return;

  let newCurrent: number;
  if (last !== null && last === yesterday.getTime()) {
    newCurrent = existing.currentStreak + 1;
  } else {
    newCurrent = 1;
  }

  const newLongest = Math.max(newCurrent, existing.longestStreak);

  await prisma.streak.update({
    where: { userId },
    data: { currentStreak: newCurrent, longestStreak: newLongest, lastActiveDate: today },
  });
}

// — streak.ts: Updates user streak rows after a session (continue vs reset vs same-day no-op).

