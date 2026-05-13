import { Suspense } from 'react';
import { requireSession } from '@/lib/session';
import { getDashboardHomeData } from '@/lib/dashboard-home-data';
import VideoPlayerWrapper from '@/features/dashboard/components/video-player-wrapper';
import Leaderboard from '@/features/dashboard/components/leaderboard';
import TodoComponent from '@/features/dashboard/components/todo-component';
import DashboardHomeSkeleton from '@/components/loading/dashboard-home-skeleton';

async function DashboardHomeContent() {
  const session = await requireSession();
  const { tasks, boards } = await getDashboardHomeData(session.user.id);

  return (
    <div
      id="focus"
      tabIndex={-1}
      className="relative flex w-full max-w-[100vw] flex-col gap-4 overflow-x-hidden px-4 pb-4 pt-8 sm:gap-6 sm:px-5 sm:pb-5 sm:pt-10 md:h-full md:min-h-0 md:gap-8 md:overflow-y-auto md:px-6 md:pb-6 md:pt-12 lg:gap-10 scroll-mt-6 before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(ellipse_92%_72%_at_50%_40%,color-mix(in_oklch,var(--color-muted)_62%,transparent)_0%,transparent_70%)] before:content-['']"
    >
      <div className="relative z-10 grid min-w-0 grid-cols-1 gap-4 overflow-x-hidden sm:gap-6 md:min-h-0 md:flex-1 md:gap-7 xl:grid-cols-[minmax(0,1.9fr)_minmax(0,3.1fr)] xl:gap-8">
        <Leaderboard boards={boards} currentUserId={session.user.id} />
        <VideoPlayerWrapper />
      </div>

      <div className="relative z-10 min-h-[10rem] shrink-0 xl:h-[25%] xl:min-h-[9.5rem] xl:flex-none xl:max-h-[42vh]">
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
