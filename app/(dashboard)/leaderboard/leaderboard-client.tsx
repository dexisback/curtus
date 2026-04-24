"use client";

import { useCallback, useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Trophy } from "lucide-react";
import type { LeaderboardEntry, Period } from "@/lib/leaderboard";
import ProfileModal, {
  type ProfileModalUser,
} from "@/features/dashboard/components/profile-modal";

const PERIODS: { value: Period; label: string }[] = [
  { value: "daily", label: "Today" },
  { value: "weekly", label: "This Week" },
  { value: "monthly", label: "This Month" },
];

const RANK_COLORS: Record<number, string> = {
  1: "oklch(0.65 0.12 55)",
  2: "oklch(0.62 0.04 200)",
  3: "oklch(0.60 0.09 45)",
};

function getInitials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatMin(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

type Props = {
  initialEntries: LeaderboardEntry[];
  initialMe: { rank: number; totalMinutes: number } | null;
  currentUserId: string | null;
};

function toProfileUser(e: LeaderboardEntry, period: Period): ProfileModalUser {
  const hours =
    period === "daily"
      ? e.totalMinutes / 60
      : period === "weekly"
        ? e.totalMinutes / 60
        : e.totalMinutes / 60;
  return {
    id: e.userId,
    name: e.name ?? "Unknown",
    initials: getInitials(e.name),
    rank: e.rank,
    hours,
    accentColor: RANK_COLORS[e.rank] ?? "oklch(0.62 0.06 75)",
  };
}

export default function LeaderboardClient({
  initialEntries,
  initialMe,
  currentUserId,
}: Props) {
  const [period, setPeriod] = useState<Period>("daily");
  const [entries, setEntries] = useState<LeaderboardEntry[]>(initialEntries);
  const [me, setMe] = useState<{ rank: number; totalMinutes: number } | null>(
    initialMe,
  );
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<ProfileModalUser | null>(null);

  async function switchPeriod(next: Period) {
    if (next === period) return;
    setPeriod(next);
    startTransition(async () => {
      const res = await fetch(`/api/leaderboard?period=${next}`);
      if (!res.ok) return;
      const data = (await res.json()) as {
        entries: LeaderboardEntry[];
        me: { rank: number; totalMinutes: number } | null;
      };
      setEntries(data.entries);
      setMe(data.me);
    });
  }

  const openProfile = useCallback(
    (entry: LeaderboardEntry) => {
      setSelected(toProfileUser(entry, period));
    },
    [period],
  );

  const onProfileExited = useCallback(() => {
    setSelected(null);
  }, []);

  const meInTop = currentUserId
    ? entries.some((e) => e.userId === currentUserId)
    : false;

  const meEntry: (LeaderboardEntry & { isSelf: true }) | null =
    me && currentUserId && !meInTop
      ? {
          rank: me.rank,
          userId: currentUserId,
          name: "You",
          image: null,
          totalMinutes: me.totalMinutes,
          isSelf: true,
        }
      : null;

  return (
    <>
      <div className="flex h-full min-h-0 w-full flex-col overflow-hidden px-4 pb-5 pt-2 sm:px-6 sm:pb-6">
        {/* Outer panel */}
        <div
          className="panel-texture flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/50
            shadow-[0_1px_2px_rgba(17,24,39,0.05),0_8px_24px_rgba(17,24,39,0.08),inset_0_1px_0_rgba(255,255,255,0.5)]
            dark:shadow-[0_1px_2px_rgba(0,0,0,0.25),0_12px_32px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.05)]"
          style={{ padding: "16px" }}
        >
          {/* Inner bg */}
          <div
            className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl bg-background"
          >
            {/* Header */}
            <div className="flex shrink-0 flex-col gap-3 border-b border-border/50 px-4 pb-3 pt-4">
              <div className="flex items-center gap-2">
                <Trophy size={14} strokeWidth={1.6} className="text-muted-foreground opacity-70" />
                <h1 className="text-[13px] font-semibold tracking-tight text-foreground">
                  Leaderboard
                </h1>
              </div>

              {/* Period pills */}
              <div className="flex gap-1.5">
                {PERIODS.map(({ value, label }) => (
                  <motion.button
                    key={value}
                    type="button"
                    whileTap={{ scale: 0.96 }}
                    onClick={() => switchPeriod(value)}
                    disabled={isPending}
                    className={
                      "rounded-full px-3 py-1 text-[11px] font-medium transition-[background-color,color,box-shadow] duration-150 " +
                      (period === value
                        ? "bg-foreground text-background shadow-[0_1px_3px_rgba(17,24,39,0.15)]"
                        : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground")
                    }
                  >
                    {label}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Rows */}
            <div className="relative min-h-0 flex-1 overflow-y-auto">
              <AnimatePresence mode="wait">
                <motion.ol
                  key={period}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.1 } }}
                  transition={{ duration: 0.18 }}
                  className="flex flex-col gap-0.5 px-2 py-2"
                >
                  {entries.length === 0 && !isPending && (
                    <li className="px-4 py-6 text-center text-[11.5px] text-muted-foreground">
                      No data yet for this period.
                    </li>
                  )}
                  {entries.map((entry, i) => {
                    const isMe = entry.userId === currentUserId;
                    const isTop3 = entry.rank <= 3;
                    const rankColor = RANK_COLORS[entry.rank];
                    const initials = getInitials(entry.name);
                    return (
                      <motion.li
                        key={entry.userId}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          delay: i * 0.025,
                          duration: 0.2,
                          ease: [0, 0, 0.58, 1],
                        }}
                      >
                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.99 }}
                          onClick={() => openProfile(entry)}
                          className={
                            "flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left " +
                            "transition-[background-color] duration-150 " +
                            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring/50 " +
                            (isMe
                              ? "bg-accent/80 font-medium"
                              : isTop3
                                ? "hover:bg-muted/50"
                                : "hover:bg-muted/50")
                          }
                          style={isTop3 && !isMe ? { background: `${rankColor}0d` } : {}}
                        >
                          <span
                            className="w-5 shrink-0 text-right text-[11.5px] font-semibold tabular-nums"
                            style={{ color: rankColor ?? "oklch(0.62 0 0)" }}
                          >
                            {entry.rank}
                          </span>

                          {entry.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={entry.image}
                              alt=""
                              className="h-7 w-7 shrink-0 rounded-full object-cover [outline:1px_solid_rgba(0,0,0,0.07)]"
                            />
                          ) : (
                            <div
                              className="flex h-7 w-7 shrink-0 select-none items-center justify-center rounded-full text-[10px] font-semibold text-white"
                              style={{
                                background: isTop3
                                  ? rankColor
                                  : "oklch(0.72 0.02 75)",
                                outline: "1px solid rgba(0,0,0,0.07)",
                              }}
                            >
                              {initials}
                            </div>
                          )}

                          <span className="min-w-0 flex-1 truncate text-[12px] text-foreground">
                            {isMe ? (entry.name ?? "You") + " (you)" : (entry.name ?? "Unknown")}
                          </span>

                          <span className="shrink-0 tabular-nums text-[11px] text-muted-foreground">
                            {formatMin(entry.totalMinutes)}
                          </span>
                        </motion.button>
                      </motion.li>
                    );
                  })}
                </motion.ol>
              </AnimatePresence>

              {isPending && (
                <div className="absolute inset-x-0 top-0 flex items-center justify-center px-4 py-3">
                  <span className="text-[11px] text-muted-foreground">Loading…</span>
                </div>
              )}
            </div>

            {/* Sticky "You" row when outside top list */}
            {meEntry && (
              <div className="shrink-0 border-t border-border/50 px-2 py-2">
                <div className="mb-1 px-3">
                  <span className="text-[10px] text-muted-foreground">Your rank</span>
                </div>
                <div
                  className="flex items-center gap-3 rounded-lg bg-accent/80 px-3 py-2 font-medium"
                >
                  <span className="w-5 shrink-0 text-right text-[11.5px] tabular-nums text-muted-foreground">
                    {meEntry.rank}
                  </span>
                  <div
                    className="flex h-7 w-7 shrink-0 select-none items-center justify-center rounded-full text-[10px] font-semibold text-white"
                    style={{
                      background: "oklch(0.72 0.02 75)",
                      outline: "1px solid rgba(0,0,0,0.07)",
                    }}
                  >
                    {getInitials(meEntry.name)}
                  </div>
                  <span className="min-w-0 flex-1 truncate text-[12px] text-foreground">
                    You
                  </span>
                  <span className="shrink-0 tabular-nums text-[11px] text-muted-foreground">
                    {formatMin(meEntry.totalMinutes)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selected && (
          <ProfileModal
            key={selected.id}
            user={selected}
            onExited={onProfileExited}
            viewerIsHost={false}
          />
        )}
      </AnimatePresence>
    </>
  );
}
