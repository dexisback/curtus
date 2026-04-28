import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import TodoWorkspaceClient from "./todo-workspace-client";

export type TaskType = "DAILY" | "YEARLY" | "DEADLINE";

export default async function TodoPage() {
  const session = await requireSession();
  const tasks = await prisma.task.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      type: true,
      deadline: true,
      isCompleted: true,
    },
  });

  return (
    <TodoWorkspaceClient
      initialTasks={tasks.map((task) => ({
        id: task.id,
        title: task.title,
        type: task.type as TaskType,
        deadline: task.deadline?.toISOString().slice(0, 10),
        isCompleted: task.isCompleted,
      }))}
    />
  );
}
