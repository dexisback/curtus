"use client";

import { useMemo, useState, useEffect } from "react";
import { motion } from "motion/react";
import { ChevronLeft, ChevronRight, Flame, Users } from "lucide-react";

export type RoomTimerMember = {
  id: string;
  name: string;
  image?: string | null;
  initials: string;
  active: boolean;
  startedAtIso: string;
  todayMinutes: number;
};

export type RoomTimerBoard = {
  id: string;
  roomName: string;
  roomCode: string;
  members: RoomTimerMember[];
};

function formatTimer(seconds: number) {
  const hh = String(Math.floor(seconds / 3600)).padStart(2, "0");
  const mm = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function elapsedSeconds(iso: string, nowMs: number) {
  const started = new Date(iso).getTime();
  return Math.max(0, Math.floor((nowMs - started) / 1000));
}

export default function RoomLeaderboardCarousel({
  boards,
  compact = false,
  onMemberClick,
}: {
  boards: RoomTimerBoard[];
  compact?: boolean;
  onMemberClick?: (member: RoomTimerMember) => void;
}) {
  const [index, setIndex] = useState(0);
  const [nowMs, setNowMs] = useState(0);
  const [mounted, setMounted] = useState(false);
  const current = boards[index] ?? boards[0];

  useEffect(() => {
    setMounted(true);
    setNowMs(Date.now());
    const i = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    if (index > boards.length - 1) setIndex(0);
  }, [boards.length, index]);

  const sortedMembers = useMemo(() => {
    if (!current) return [];
    return [...current.members].sort((a, b) => {
      const aSec = a.active ? elapsedSeconds(a.startedAtIso, nowMs) : 0;
      const bSec = b.active ? elapsedSeconds(b.startedAtIso, nowMs) : 0;
      if (aSec !== bSec) return bSec - aSec;
      return b.todayMinutes - a.todayMinutes;
    });
  }, [current, nowMs]);

  if (!current) return null;

  const next = () => setIndex((v) => (v + 1) % boards.length);
  const prev = () => setIndex((v) => (v - 1 + boards.length) % boards.length);

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-border/50 px-3 pb-2 pt-3">
        <div className="min-w-0">
          <p className="truncate text-[11.5px] font-semibold text-foreground">{current.roomName}</p>
          <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
            <Users size={10} strokeWidth={1.7} />
            <span className="tabular-nums">{current.members.length}</span>
            <span>members</span>
          </p>
        </div>
        <div className="flex items-center gap-1">
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={prev}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-card/70
              text-muted-foreground transition-colors duration-150 hover:bg-accent/70 hover:text-foreground"
            aria-label="Previous room"
          >
            <ChevronLeft size={15} strokeWidth={1.8} />
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={next}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-card/70
              text-muted-foreground transition-colors duration-150 hover:bg-accent/70 hover:text-foreground"
            aria-label="Next room"
          >
            <ChevronRight size={15} strokeWidth={1.8} />
          </motion.button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {sortedMembers.map((member, i) => {
            const running = mounted && member.active ? elapsedSeconds(member.startedAtIso, nowMs) : 0;
            return (
              <motion.button
                key={member.id}
                type="button"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03, duration: 0.2, ease: [0, 0, 0.58, 1] }}
                whileTap={{ scale: 0.96 }}
                onClick={() => onMemberClick?.(member)}
                className="panel-texture flex min-h-[100px] w-full flex-col items-center justify-center rounded-xl border border-border/50 px-2 py-2
                  transition-[background-color] duration-150 hover:bg-muted/40"
              >
                {member.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={member.image}
                    alt=""
                    className={compact ? "h-9 w-9 rounded-full object-cover [outline:1px_solid_rgba(0,0,0,0.08)]" : "h-10 w-10 rounded-full object-cover [outline:1px_solid_rgba(0,0,0,0.08)]"}
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-foreground">
                    {member.initials}
                  </div>
                )}
                <p className="mt-1 max-w-full truncate text-[10.5px] font-medium text-foreground">{member.name}</p>
                <p className="tabular-nums text-[11px] font-semibold text-foreground">{formatTimer(running)}</p>
                <div className="mt-1 flex items-center gap-1 text-[9px] text-muted-foreground">
                  {member.active ? <Flame size={9} className="text-amber-500" /> : <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />}
                  <span className="tabular-nums">{member.todayMinutes}m today</span>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
