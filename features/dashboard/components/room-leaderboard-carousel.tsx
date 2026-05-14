'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Video, VideoOff } from 'lucide-react';
import AvatarWithFallback from '@/components/ui/avatar-with-fallback';

export type RoomTimerMember = {
  id: string;
  name: string;
  image?: string | null;
  initials: string;
  active: boolean;
  startedAtIso: string;
  todayMinutes: number;
  todaySeconds?: number;
};

export type RoomTimerBoard = {
  id: string;
  roomName: string;
  roomCode: string;
  members: RoomTimerMember[];
};

function formatTimer(seconds: number) {
  const hh = String(Math.floor(seconds / 3600)).padStart(2, '0');
  const mm = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

function elapsedSeconds(iso: string, nowMs: number) {
  const started = new Date(iso).getTime();
  return Math.max(0, Math.floor((nowMs - started) / 1000));
}

function GridMemberVideo({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);
  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted
      className="absolute inset-0 h-full w-full object-cover"
    />
  );
}

export default function RoomLeaderboardCarousel({
  boards,
  compact = false,
  onMemberClick,
  onBoardChange,
  streamForMember,
  hasVideoForMember,
  currentUserId,
  selfCameraOn,
  selfCameraStarting,
  onToggleSelfCamera,
}: {
  boards: RoomTimerBoard[];
  compact?: boolean;
  onMemberClick?: (member: RoomTimerMember) => void;
  onBoardChange?: (board: RoomTimerBoard, index: number) => void;
  /** When set, members with video show a live tile (room view). */
  streamForMember?: (userId: string) => MediaStream | null;
  hasVideoForMember?: (userId: string) => boolean;
  currentUserId?: string | null;
  selfCameraOn?: boolean;
  selfCameraStarting?: boolean;
  onToggleSelfCamera?: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [nowMs, setNowMs] = useState(0);
  const [mounted, setMounted] = useState(false);
  const safeIndex =
    boards.length === 0 ? 0 : Math.min(index, boards.length - 1);
  const current = boards[safeIndex];

  useEffect(() => {
    queueMicrotask(() => {
      setMounted(true);
      setNowMs(Date.now());
    });
    const i = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    if (!current) return;
    onBoardChange?.(current, safeIndex);
  }, [current, onBoardChange, safeIndex]);

  const nextBoard = () =>
    setIndex((v) => {
      if (boards.length === 0) return 0;
      const i = Math.min(v, boards.length - 1);
      return (i + 1) % boards.length;
    });
  const prevBoard = () =>
    setIndex((v) => {
      if (boards.length === 0) return 0;
      const i = Math.min(v, boards.length - 1);
      return (i - 1 + boards.length) % boards.length;
    });

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

  const videoMode = Boolean(streamForMember && hasVideoForMember);

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-border/50 px-2.5 pb-2 pt-2.5">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold tracking-tight text-foreground [text-wrap:balance]">
            {current.roomName}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={prevBoard}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-border/60 bg-card/70
              text-muted-foreground transition-colors duration-150 hover:bg-accent/70 hover:text-foreground"
            aria-label="Previous room"
          >
            <ChevronLeft size={13} strokeWidth={1.8} />
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={nextBoard}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-border/60 bg-card/70
              text-muted-foreground transition-colors duration-150 hover:bg-accent/70 hover:text-foreground"
            aria-label="Next room"
          >
            <ChevronRight size={13} strokeWidth={1.8} />
          </motion.button>
        </div>
      </div>

      <div
        className="min-h-0 flex-1 overflow-visible px-2 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:overflow-y-auto"
        style={{ msOverflowStyle: 'none' }}
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {sortedMembers.map((member, i) => {
            const sessionRunning =
              mounted && member.active
                ? elapsedSeconds(member.startedAtIso, nowMs)
                : 0;
            const completedTodaySeconds = Math.max(0, member.todaySeconds ?? 0);
            /** Always show cumulative today time; while active, add current session elapsed to completed baseline. */
            const displaySeconds = member.active
              ? completedTodaySeconds + sessionRunning
              : completedTodaySeconds;
            const hasVideo = hasVideoForMember?.(member.id) ?? false;
            const stream = streamForMember?.(member.id) ?? null;
            const showVideoTile = videoMode && hasVideo && stream;
            const isSelf = Boolean(
              currentUserId && member.id === currentUserId,
            );
            const showSelfCamToggle = videoMode && isSelf && onToggleSelfCamera;
            const cardClickable = Boolean(onMemberClick);

            return (
              <motion.div
                key={member.id}
                tabIndex={cardClickable ? 0 : undefined}
                aria-label={cardClickable ? `Open ${member.name}` : undefined}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: i * 0.03,
                  duration: 0.2,
                  ease: [0, 0, 0.58, 1],
                }}
                whileTap={cardClickable ? { scale: 0.985 } : undefined}
                whileHover={cardClickable ? { y: -1 } : undefined}
                onClick={
                  cardClickable ? () => onMemberClick?.(member) : undefined
                }
                onKeyDown={
                  cardClickable
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onMemberClick?.(member);
                        }
                      }
                    : undefined
                }
                className={
                  'relative flex min-h-[7.5rem] w-full flex-col overflow-hidden rounded-[6px] border border-border/50 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background ' +
                  (cardClickable ? 'cursor-pointer ' : '') +
                  (showVideoTile
                    ? 'bg-[#161925] ring-1 ring-[#161925]/90'
                    : 'bg-card ring-1 ring-inset ring-black/[0.03] transition-[background-color] duration-150 hover:bg-muted/35 dark:ring-white/[0.045]')
                }
              >
                {showVideoTile ? (
                  <>
                    <GridMemberVideo stream={stream} />
                    <div
                      className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#161925]/92 via-[#161925]/38 to-transparent pt-8 pb-1.5"
                      aria-hidden
                    />
                    <div className="pointer-events-none absolute inset-x-0 bottom-1.5 px-2 text-center">
                      <p className="truncate text-[10.5px] font-medium text-white drop-shadow-sm">
                        {member.name}
                      </p>
                      <p className="tabular-nums text-[11px] font-semibold tracking-tight text-white/95 drop-shadow">
                        {formatTimer(displaySeconds)}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center px-2 py-2">
                    <AvatarWithFallback
                      name={member.name}
                      src={member.image}
                      initials={member.initials}
                      className={
                        compact
                          ? 'h-9 w-9 rounded-full [outline:1px_solid_rgba(0,0,0,0.08)]'
                          : 'h-10 w-10 rounded-full [outline:1px_solid_rgba(0,0,0,0.08)]'
                      }
                      fallbackClassName="rounded-full bg-muted text-[11px] font-semibold text-foreground"
                    />
                    <p className="mt-1 max-w-full truncate text-[10.5px] font-medium text-foreground/90">
                      {member.name}
                    </p>
                    <p className="tabular-nums text-[12px] font-semibold tracking-tight text-foreground">
                      {formatTimer(displaySeconds)}
                    </p>
                  </div>
                )}

                {showSelfCamToggle && (
                  <div className="absolute right-1 top-1 z-20">
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.92 }}
                      disabled={selfCameraStarting}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleSelfCamera();
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/22 bg-[#161925]/58 text-white shadow-md backdrop-blur-sm transition-colors hover:bg-[#161925]/72 disabled:opacity-60"
                      aria-label={
                        selfCameraOn ? 'Turn camera off' : 'Turn camera on'
                      }
                      title={
                        selfCameraOn
                          ? 'Camera on — click to turn off'
                          : 'Camera off — click to turn on'
                      }
                    >
                      {selfCameraStarting ? (
                        <span className="h-3.5 w-3.5 animate-pulse rounded-full bg-white/70" />
                      ) : selfCameraOn ? (
                        <Video size={15} strokeWidth={1.85} />
                      ) : (
                        <VideoOff size={15} strokeWidth={1.85} />
                      )}
                    </motion.button>
                  </div>
                )}

                {videoMode && !isSelf && hasVideo && !stream && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#161925]/91">
                    <p className="text-[10px] text-white/70">Connecting…</p>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// — Rotating mini leaderboards; optional live video tiles + per-room camera toggle (room view).
