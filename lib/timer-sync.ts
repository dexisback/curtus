import type { RoomTimerBoard } from "@/features/dashboard/components/room-leaderboard-carousel";

/** Room-board / study-timer snapshot poll interval (dashboard miniboard, rooms index, provider resync). */
export const TIMER_POLL_INTERVAL_MS = 60_000;

export type SelfStudyTimerSlice = {
  active: boolean;
  startedAtMs: number | null;
};

/** Overlay canonical study timer onto the current user's member rows so dock and miniboards match. */
export function mergeSelfStudyTimer(
  boards: RoomTimerBoard[],
  currentUserId: string | null,
  timer: SelfStudyTimerSlice,
): RoomTimerBoard[] {
  if (!currentUserId) return boards;

  return boards.map((board) => ({
    ...board,
    members: board.members.map((m) => {
      if (m.id !== currentUserId) return m;
      const startedAtIso =
        timer.active && timer.startedAtMs !== null
          ? new Date(timer.startedAtMs).toISOString()
          : new Date(0).toISOString();
      return {
        ...m,
        active: timer.active,
        startedAtIso,
      };
    }),
  }));
}
