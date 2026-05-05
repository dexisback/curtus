import { Suspense } from "react";
import { requireSession } from "@/lib/session";
import { getDashboardHomeData } from "@/lib/dashboard-home-data";
import VideoPlayerWrapper from "@/features/dashboard/components/video-player-wrapper";
import Leaderboard from "@/features/dashboard/components/leaderboard";
import TodoComponent from "@/features/dashboard/components/todo-component";
import DashboardHomeSkeleton from "@/components/loading/dashboard-home-skeleton";

async function DashboardHomeContent() {
  const session = await requireSession();
  const { tasks, boards } = await getDashboardHomeData(session.user.id);

  return (
    <div
      id="focus"
      tabIndex={-1}
      className="flex h-full min-h-0 w-full flex-col gap-6 overflow-hidden px-5 pb-5 pt-10 sm:gap-8 sm:px-6 sm:pb-6 sm:pt-12 md:gap-10 scroll-mt-6"
    >
      <div className="grid min-h-0 min-w-0 flex-1 grid-cols-[minmax(0,1.9fr)_minmax(0,3.1fr)] gap-6 sm:gap-7 md:gap-8">
        <Leaderboard boards={boards} currentUserId={session.user.id} />
        <VideoPlayerWrapper />
      </div>

      <div className="h-[25%] min-h-[9.5rem] shrink-0">
        <TodoComponent
          initialTasks={tasks.map((task) => ({
            id: task.id,
            title: task.title,
            type: task.type,
            isCompleted: task.isCompleted,
          }))}
        />
      </div>
    </div>
  );
}

/** Suspense streams the shell immediately; Prisma work runs inside the boundary. */
export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardHomeSkeleton />}>
      <DashboardHomeContent />
    </Suspense>
  );
}
