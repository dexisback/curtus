import { requireSession } from "@/lib/session";
import TodoWorkspaceClient from "./todo-workspace-client";

export type TaskType = "DAILY" | "YEARLY" | "DEADLINE";

const PLACEHOLDER_TASKS: {
  id: string;
  title: string;
  type: TaskType;
  deadline?: string;
  isCompleted: boolean;
}[] = [
  { id: "1", title: "Complete 2-hour focus session", type: "DAILY", isCompleted: true },
  { id: "2", title: "Review chapter notes", type: "DAILY", isCompleted: false },
  { id: "3", title: "Read 30 pages", type: "DAILY", isCompleted: false },
  { id: "4", title: "Finish project proposal", type: "DEADLINE", deadline: "2026-04-28", isCompleted: false },
  { id: "5", title: "Submit assignment", type: "DEADLINE", deadline: "2026-04-30", isCompleted: false },
  { id: "6", title: "Read 24 books", type: "YEARLY", isCompleted: false },
  { id: "7", title: "Build a side project", type: "YEARLY", isCompleted: false },
  { id: "8", title: "Morning walk", type: "DAILY", isCompleted: false },
];

export default async function TodoPage() {
  await requireSession();
  return <TodoWorkspaceClient initialTasks={PLACEHOLDER_TASKS} />;
}
