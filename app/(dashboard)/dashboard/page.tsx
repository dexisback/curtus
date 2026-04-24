import { requireSession } from "@/lib/session";
import VideoPlayerWrapper from "@/features/dashboard/components/video-player-wrapper";
import Leaderboard from "@/features/dashboard/components/leaderboard";
import TodoComponent from "@/features/dashboard/components/todo-component";

export default async function DashboardPage() {
  await requireSession();

  return (
    <div
      id="focus"
      tabIndex={-1}
      className="flex h-full min-h-0 w-full flex-col gap-6 overflow-hidden px-5 pb-5 pt-10 sm:gap-8 sm:px-6 sm:pb-6 sm:pt-12 md:gap-10 scroll-mt-6"
    >
      {/* Top bento: ~40% leaderboard (left) + ~60% video (right) */}
      <div className="grid min-h-0 min-w-0 flex-1 grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-6 sm:gap-7 md:gap-8">
        <Leaderboard />
        <VideoPlayerWrapper />
      </div>

      {/* Bottom todo/calendar strip */}
      <div className="h-[25%] min-h-[9.5rem] shrink-0">
        <TodoComponent />
      </div>
    </div>
  );
}
