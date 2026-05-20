import { cache } from 'react';
import { prisma } from '@/lib/db';
import { getRoomTimerBoards } from '@/lib/room-timer-boards';

/** Room boards + todo strip for `/dashboard`; cached per request. */
export const getDashboardHomeData = cache(async (userId: string) => {
  const [tasks, boards] = await Promise.all([
    prisma.task.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 24,
      select: {
        id: true,
        title: true,
        type: true,
        isCompleted: true,
        deadline: true,
      },
    }),
    getRoomTimerBoards(userId, 'dashboard'),
  ]);

  return { tasks, boards };
});
