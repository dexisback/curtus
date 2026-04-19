"use client";

import { useState, useTransition } from "react";
import type { LeaderboardEntry, Period } from "@/lib/leaderboard";

const PERIODS: { value: Period; label: string }[] = [
  { value: "daily", label: "Today" },
  { value: "weekly", label: "This Week" },
  { value: "monthly", label: "This Month" },
];

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

export default function LeaderboardClient({ initialEntries, initialMe, currentUserId }: Props) {
  const [period, setPeriod] = useState<Period>("daily");
  const [entries, setEntries] = useState<LeaderboardEntry[]>(initialEntries);
  const [me, setMe] = useState<{ rank: number; totalMinutes: number } | null>(initialMe);
  const [isPending, startTransition] = useTransition();

  async function switchPeriod(next: Period) {
    if (next === period) return;
    setPeriod(next);
    startTransition(async () => {
      const res = await fetch(`/api/leaderboard?period=${next}`);
      if (!res.ok) return;
      const data = await res.json() as {
        entries: LeaderboardEntry[];
        me: { rank: number; totalMinutes: number } | null;
      };
      setEntries(data.entries);
      setMe(data.me);
    });
  }

  const meInTop = currentUserId
    ? entries.some((e) => e.userId === currentUserId)
    : false;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Leaderboard</h1>

      {/* Period tabs */}
      <div className="flex gap-2 mb-6">
        {PERIODS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => switchPeriod(value)}
            disabled={isPending}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
              period === value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {isPending && (
        <p className="text-sm text-muted-foreground mb-4">Loading…</p>
      )}

      {/* Table */}
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No data yet for this period.</p>
      ) : (
        <ol className="space-y-1">
          {entries.map((entry) => {
            const isMe = entry.userId === currentUserId;
            return (
              <li
                key={entry.userId}
                className={`flex items-center gap-3 px-3 py-2 rounded ${
                  isMe ? "bg-primary/10 font-medium" : "hover:bg-muted/50"
                }`}
              >
                <span className="w-7 text-right text-sm text-muted-foreground shrink-0">
                  #{entry.rank}
                </span>
                {entry.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={entry.image}
                    alt=""
                    className="w-7 h-7 rounded-full shrink-0"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-muted shrink-0" />
                )}
                <span className="flex-1 text-sm truncate">{entry.name ?? "Unknown"}</span>
                <span className="text-sm tabular-nums">{formatMin(entry.totalMinutes)}</span>
              </li>
            );
          })}
        </ol>
      )}

      {/* Caller's row if outside top list */}
      {me && !meInTop && (
        <div className="mt-4 border-t pt-4">
          <p className="text-xs text-muted-foreground mb-1">Your rank</p>
          <div className="flex items-center gap-3 px-3 py-2 rounded bg-primary/10 font-medium">
            <span className="w-7 text-right text-sm text-muted-foreground shrink-0">
              #{me.rank}
            </span>
            <div className="w-7 h-7 rounded-full bg-muted shrink-0" />
            <span className="flex-1 text-sm">You</span>
            <span className="text-sm tabular-nums">{formatMin(me.totalMinutes)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
