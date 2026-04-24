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

const ROOM_BOARDS: RoomTimerBoard[] = [
  {
    id: "r1",
    roomName: "Study Squad Alpha",
    roomCode: "ALPHA1",
    members: [
      { id: "1", name: "Amaan H.", initials: "AH", image: null, active: true, startedAtIso: new Date(Date.now() - 82 * 60 * 1000).toISOString(), todayMinutes: 124 },
      { id: "2", name: "Sarah K.", initials: "SK", image: null, active: true, startedAtIso: new Date(Date.now() - 54 * 60 * 1000).toISOString(), todayMinutes: 101 },
      { id: "3", name: "Dev P.", initials: "DP", image: null, active: false, startedAtIso: new Date(Date.now() - 21 * 60 * 1000).toISOString(), todayMinutes: 76 },
      { id: "4", name: "Meera R.", initials: "MR", image: null, active: true, startedAtIso: new Date(Date.now() - 39 * 60 * 1000).toISOString(), todayMinutes: 87 },
    ],
  },
  {
    id: "r2",
    roomName: "Deep Work Room",
    roomCode: "FOCUS9",
    members: [
      { id: "5", name: "James T.", initials: "JT", image: null, active: true, startedAtIso: new Date(Date.now() - 64 * 60 * 1000).toISOString(), todayMinutes: 90 },
      { id: "6", name: "Priya N.", initials: "PN", image: null, active: true, startedAtIso: new Date(Date.now() - 48 * 60 * 1000).toISOString(), todayMinutes: 82 },
      { id: "7", name: "Omar S.", initials: "OS", image: null, active: false, startedAtIso: new Date(Date.now() - 11 * 60 * 1000).toISOString(), todayMinutes: 51 },
    ],
  },
];

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

export default function Leaderboard() {
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
          className="relative h-full min-h-0 w-full min-w-0 max-w-full border border-black/[0.04] panel-texture"
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
              <RoomLeaderboardCarousel boards={ROOM_BOARDS} compact onMemberClick={openProfile} />
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
