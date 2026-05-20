import { requireSession } from '@/lib/session';
import { prisma } from '@/lib/db';
import { getOrCreateUserSettings } from '@/lib/user-settings';
import TodoWorkspaceClient from './todo-workspace-client';

export type TaskType = 'DAILY' | 'YEARLY' | 'DEADLINE';

export default async function TodoPage() {
  const session = await requireSession();
  const [tasks, settings] = await Promise.all([
    prisma.task.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        type: true,
        deadline: true,
        isCompleted: true,
      },
    }),
    getOrCreateUserSettings(prisma, session.user.id),
  ]);

  return (
    <TodoWorkspaceClient
      initialTasks={tasks.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description ?? undefined,
        type: task.type as TaskType,
        deadline: task.deadline?.toISOString(),
        isCompleted: task.isCompleted,
      }))}
      initialDdayDate={settings.todoDdayDate}
      initialDdayTitle={settings.todoDdayTitle}
    />
  );
}

// — Todo workspace route shell.
