"use client";

import { useState, useCallback } from "react";
import { motion } from "motion/react";
import { Trophy } from "lucide-react";
import ProfileModal, { type ProfileModalUser } from "./profile-modal";
import RoomLeaderboardCarousel, { type RoomTimerBoard } from "./room-leaderboard-carousel";

/** Slimmer concentric radii + lighter shadow than the video panel — same column width, less visual bulk. */
const LB_OUTER = 22;
const LB_GAP = 14;
const LB_INNER = LB_OUTER - LB_GAP;
const LB_SHADOW = [
  "0 1px 2px rgba(17,24,39,0.04)",
  "0 4px 14px rgba(17,24,39,0.05)",
].join(",");


const RANK_COLORS: Record<number, string> = {
  1: "oklch(0.65 0.12 55)",
  2: "oklch(0.62 0.04 200)",
  3: "oklch(0.60 0.09 45)",
};

function toProfileUser(u: RoomTimerBoard["members"][number]): ProfileModalUser {
  const pseudoRank = u.todayMinutes >= 100 ? 1 : u.todayMinutes >= 80 ? 2 : 3;
  return {
    id: u.id,
    name: u.name,
    initials: u.initials,
    rank: pseudoRank,
    hours: u.todayMinutes / 60,
    accentColor: RANK_COLORS[pseudoRank] ?? "oklch(0.62 0.06 75)",
  };
}

export default function Leaderboard({ boards }: { boards: RoomTimerBoard[] }) {
  const [selected, setSelected] = useState<ProfileModalUser | null>(null);

  const openProfile = useCallback((u: RoomTimerBoard["members"][number]) => {
    setSelected(toProfileUser(u));
  }, []);

  const onProfileExited = useCallback(() => {
    setSelected(null);
  }, []);

  return (
    <>
      <div className="flex h-full min-h-0 w-full min-w-0 items-stretch justify-start pl-0.5 pr-0 pt-1 pb-2">
        <motion.div
          className="relative h-full min-h-0 w-full min-w-0 max-w-full border border-black/[0.04] bg-[color:var(--panel-texture-bg)] bg-[image:var(--panel-texture-image)] bg-[length:200px_200px]"
          style={{
            borderRadius: `${LB_OUTER}px`,
            padding: `${LB_GAP}px`,
            boxShadow: LB_SHADOW,
          }}
          whileHover={{ y: -1, scale: 1.002 }}
          transition={{ type: "spring", stiffness: 320, damping: 28, mass: 0.6 }}
        >
          <div
            className="relative flex h-full w-full flex-col overflow-hidden bg-background"
            style={{ borderRadius: `${LB_INNER}px` }}
          >
            <div className="flex shrink-0 items-center justify-between px-3 pt-3 pb-2">
              <span className="text-[10.5px] font-medium tracking-wide text-foreground">
                Leaderboard
              </span>
              <span
                className="rounded-full border border-border/70 px-1.5 py-0.5 text-[9.5px] text-muted-foreground"
                style={{ background: "oklch(0.965 0.004 75)" }}
              >
                This week
              </span>
            </div>

            <div className="mx-2.5 h-px shrink-0 bg-border/50" />

            <div className="min-h-0 flex-1 px-1.5 pb-1">
              {boards.length > 0 ? (
                <RoomLeaderboardCarousel
                  boards={boards}
                  compact
                  onMemberClick={openProfile}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">
                  Join a room to view room leaderboard activity.
                </div>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-1.5 border-t border-border/50 px-3 py-2">
              <Trophy size={9.5} className="shrink-0 text-muted-foreground" />
              <span className="text-[9.5px] text-muted-foreground">
                Room timers are live per room
              </span>
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
