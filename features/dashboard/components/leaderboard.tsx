'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { useStudyTimer } from '@/components/study-timer-provider';
import { mergeSelfStudyTimer, TIMER_POLL_INTERVAL_MS } from '@/lib/timer-sync';
import { SPRING_DRAG_RELEASE, SPRING_HOVER } from '@/lib/ui-motion';
import ProfileModal, { type ProfileModalUser } from './profile-modal';
import RoomLeaderboardCarousel, {
  type RoomTimerBoard,
} from './room-leaderboard-carousel';

const LB_OUTER = 22;
const LB_GAP = 14;
const LB_INNER = LB_OUTER - LB_GAP;
const LB_SHADOW = [
  '0 1px 2px rgba(17,24,39,0.04)',
  '0 4px 14px rgba(17,24,39,0.05)',
].join(',');

const RANK_COLORS: Record<number, string> = {
  1: 'oklch(0.65 0.12 55)',
  2: 'oklch(0.62 0.04 200)',
  3: 'oklch(0.60 0.09 45)',
};

function pseudoRankFromMinutes(minutes: number): number {
  if (minutes >= 100) return 1;
  if (minutes >= 80) return 2;
  return 3;
}

function toProfileUser(u: RoomTimerBoard['members'][number]): ProfileModalUser {
  const pseudoRank = pseudoRankFromMinutes(u.todayMinutes);
  return {
    id: u.id,
    name: u.name,
    initials: u.initials,
    rank: pseudoRank,
    hours: u.todayMinutes / 60,
    accentColor: RANK_COLORS[pseudoRank] ?? 'oklch(0.62 0.06 75)',
  };
}

export default function Leaderboard({
  boards: initialBoards,
  currentUserId,
}: {
  boards: RoomTimerBoard[];
  currentUserId: string;
}) {
  const { active, startedAtMs, todaySeconds } = useStudyTimer();
  const [boards, setBoards] = useState(initialBoards);
  const [selected, setSelected] = useState<ProfileModalUser | null>(null);

  const displayBoards = useMemo(
    () =>
      mergeSelfStudyTimer(boards, currentUserId, {
        active,
        startedAtMs,
        todaySeconds,
      }),
    [boards, currentUserId, active, startedAtMs, todaySeconds],
  );

  useEffect(() => {
    setBoards(initialBoards);
  }, [initialBoards]);

  useEffect(() => {
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | undefined;
    let inFlight = false;
    let queued = false;

    async function pull() {
      if (inFlight) {
        queued = true;
        return;
      }
      inFlight = true;
      try {
        const res = await fetch('/api/room-boards?mode=dashboard', {
          credentials: 'include',
          cache: 'no-store',
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { boards?: RoomTimerBoard[] };
        if (data.boards) setBoards(data.boards);
      } catch {
        /* ignore */
      } finally {
        inFlight = false;
        if (!cancelled && queued) {
          queued = false;
          void pull();
        }
      }
    }

    function clearPoll() {
      if (intervalId !== undefined) {
        clearInterval(intervalId);
        intervalId = undefined;
      }
    }

    function startPollIfVisible() {
      clearPoll();
      if (
        typeof document === 'undefined' ||
        document.visibilityState !== 'visible'
      )
        return;
      intervalId = setInterval(() => void pull(), TIMER_POLL_INTERVAL_MS);
    }

    const onStats = () => void pull();
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        void pull();
        startPollIfVisible();
      } else {
        clearPoll();
      }
    };

    void pull();
    startPollIfVisible();
    window.addEventListener('study-stats-changed', onStats);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelled = true;
      clearPoll();
      window.removeEventListener('study-stats-changed', onStats);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  const openProfile = useCallback((u: RoomTimerBoard['members'][number]) => {
    setSelected(toProfileUser(u));
  }, []);

  const onProfileExited = useCallback(() => {
    setSelected(null);
  }, []);

  return (
    <>
      <div className="flex h-full min-h-0 w-full min-w-0 items-stretch justify-start pl-0.5 pr-0 pt-1 pb-2">
        <motion.div
          className="app-cursor-drag relative h-full min-h-0 w-full min-w-0 max-w-full border border-black/[0.04] bg-[color:var(--panel-texture-bg)] bg-[image:var(--panel-texture-image)] bg-[length:200px_200px]"
          style={{
            borderRadius: `${LB_OUTER}px`,
            padding: `${LB_GAP}px`,
            boxShadow: LB_SHADOW,
          }}
          whileHover={{ y: -1, scale: 1.002 }}
          drag
          dragConstraints={{ top: -4, left: -4, right: 4, bottom: 4 }}
          dragElastic={0.08}
          dragTransition={SPRING_DRAG_RELEASE}
          transition={SPRING_HOVER}
        >
          <div
            className="relative flex h-full w-full flex-col overflow-hidden bg-background"
            style={{ borderRadius: `${LB_INNER}px` }}
          >
            <div className="min-h-0 flex-1 px-1.5 py-1.5">
              {displayBoards.length > 0 ? (
                <RoomLeaderboardCarousel
                  boards={displayBoards}
                  compact
                  currentUserId={currentUserId}
                  onMemberClick={openProfile}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">
                  Join a room to view room leaderboard activity.
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {selected && (
        <ProfileModal
          key={selected.id}
          user={selected}
          onExited={onProfileExited}
          viewerIsHost={false}
        />
      )}
    </>
  );
}

// — Dashboard leaderboard strip / card list.
