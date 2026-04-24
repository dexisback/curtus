"use client";

import { motion } from "motion/react";
import { Trophy } from "lucide-react";

/** Slimmer concentric radii + lighter shadow than the video panel — same column width, less visual bulk. */
const LB_OUTER = 22;
const LB_GAP = 14;
const LB_INNER = LB_OUTER - LB_GAP;
const LB_SHADOW = [
  "0 1px 2px rgba(17,24,39,0.04)",
  "0 4px 14px rgba(17,24,39,0.05)",
].join(",");

const PLACEHOLDER_USERS = [
  { rank: 1, name: "Amaan H.", initials: "AH", hours: 14.5 },
  { rank: 2, name: "Sarah K.", initials: "SK", hours: 12.2 },
  { rank: 3, name: "Dev P.", initials: "DP", hours: 11.8 },
  { rank: 4, name: "Meera R.", initials: "MR", hours: 9.4 },
  { rank: 5, name: "James T.", initials: "JT", hours: 8.1 },
  { rank: 6, name: "Priya N.", initials: "PN", hours: 6.7 },
  { rank: 7, name: "Omar S.", initials: "OS", hours: 5.3 },
];

const RANK_COLORS: Record<number, string> = {
  1: "oklch(0.65 0.12 55)",
  2: "oklch(0.62 0.04 200)",
  3: "oklch(0.60 0.09 45)",
};

export default function Leaderboard() {
  return (
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

          <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-1.5 py-1.5">
            {PLACEHOLDER_USERS.map((user, i) => {
              const isTop3 = user.rank <= 3;
              const rankColor = RANK_COLORS[user.rank];
              return (
                <motion.div
                  key={user.rank}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    delay: i * 0.04,
                    duration: 0.22,
                    ease: [0, 0, 0.58, 1],
                  }}
                  className="flex cursor-default items-center gap-2 rounded-md px-1.5 py-1.5 transition-colors duration-150 hover:bg-muted/50"
                  style={isTop3 ? { background: `${rankColor}0c` } : {}}
                >
                  <span
                    className="w-3.5 shrink-0 text-right text-[10.5px] font-semibold tabular-nums"
                    style={{ color: rankColor ?? "oklch(0.62 0 0)" }}
                  >
                    {user.rank}
                  </span>

                  <div
                    className="flex h-5 w-5 shrink-0 select-none items-center justify-center rounded-full text-[8.5px] font-semibold text-white"
                    style={{
                      background: isTop3
                        ? rankColor
                        : "oklch(0.72 0.02 75)",
                      outline: "1px solid rgba(0,0,0,0.07)",
                    }}
                  >
                    {user.initials}
                  </div>

                  <span className="min-w-0 flex-1 truncate text-[10.5px] text-foreground">
                    {user.name}
                  </span>

                  <span className="shrink-0 tabular-nums text-[9.5px] text-muted-foreground">
                    {user.hours.toFixed(1)}h
                  </span>
                </motion.div>
              );
            })}
          </div>

          <div className="flex shrink-0 items-center gap-1.5 border-t border-border/50 px-3 py-2">
            <Trophy size={9.5} className="shrink-0 text-muted-foreground" />
            <span className="text-[9.5px] text-muted-foreground">
              Study time resets Monday
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
