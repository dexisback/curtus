"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, ChevronDown, Hash, Lock, Users, Video } from "lucide-react";
import { useStudyTimer } from "@/components/study-timer-provider";
import { mergeSelfStudyTimer, TIMER_POLL_INTERVAL_MS } from "@/lib/timer-sync";
import RoomLeaderboardCarousel, {
  type RoomTimerBoard,
} from "@/features/dashboard/components/room-leaderboard-carousel";

type PublicRoom = {
  code: string;
  name: string;
  memberCount: number;
  hostName: string;
};

type MyRoom = {
  code: string;
  name: string;
  role: string;
  memberCount: number;
  hostName: string;
};

type Props = {
  publicRooms: PublicRoom[];
  myRooms: MyRoom[];
  boards: RoomTimerBoard[];
  currentUserId: string;
};

function RoomCard({
  name,
  code,
  memberCount,
  hostName,
  role,
  index,
}: {
  name: string;
  code: string;
  memberCount: number;
  hostName?: string;
  role?: string;
  index: number;
}) {
  const router = useRouter();
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.22, ease: [0, 0, 0.58, 1] }}
      className="bg-[color:var(--panel-texture-bg)] bg-[image:var(--panel-texture-image)] bg-[length:200px_200px] group relative flex flex-col gap-3 rounded-lg border border-border/50 p-4
        shadow-[0_1px_2px_rgba(17,24,39,0.04),0_4px_12px_rgba(17,24,39,0.06)]
        transition-shadow duration-200 hover:shadow-[0_1px_2px_rgba(17,24,39,0.06),0_8px_20px_rgba(17,24,39,0.10)]"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-foreground">{name}</p>
          {hostName && (
            <p className="mt-0.5 truncate text-[10.5px] text-muted-foreground">
              by {hostName}
            </p>
          )}
        </div>
        {role && (
          <span
            className="shrink-0 rounded-[6px] border border-border/60 bg-card/80 px-2 py-0.5 text-[9.5px] font-medium text-muted-foreground capitalize"
          >
            {role.toLowerCase()}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
          <Users size={11} strokeWidth={1.6} />
          <span className="tabular-nums">
            {memberCount === 1 ? `${memberCount} member` : `${memberCount} members`}
          </span>
        </div>
        <motion.button
          type="button"
          whileTap={{ scale: 0.96 }}
          onClick={() => router.push(`/room/${code}`)}
          className="flex items-center gap-1.5 rounded-[6px] bg-cta px-3 py-1.5 text-[11px] font-medium text-cta-foreground
            shadow-[0_1px_3px_rgba(17,24,39,0.1),inset_0_1px_0_rgba(255,255,255,0.12)]
            transition-opacity duration-150"
        >
          Enter
          <ArrowRight size={11} strokeWidth={2} />
        </motion.button>
      </div>
    </motion.div>
  );
}

export default function RoomsClient({
  publicRooms,
  myRooms,
  boards: initialBoards,
  currentUserId,
}: Props) {
  const { active, startedAtMs } = useStudyTimer();
  const router = useRouter();
  const [boards, setBoards] = useState(initialBoards);
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [roomListView, setRoomListView] = useState<"my" | "public">("public");

  const displayBoards = useMemo(
    () =>
      mergeSelfStudyTimer(boards, currentUserId, {
        active,
        startedAtMs,
      }),
    [boards, currentUserId, active, startedAtMs],
  );

  useEffect(() => {
    setBoards(initialBoards);
  }, [initialBoards]);

  useEffect(() => {
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | undefined;

    async function pull() {
      try {
        const res = await fetch("/api/room-boards?mode=rooms", {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { boards?: typeof initialBoards };
        if (data.boards) setBoards(data.boards);
      } catch {
        /* ignore */
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
      if (typeof document === "undefined" || document.visibilityState !== "visible") return;
      intervalId = setInterval(() => void pull(), TIMER_POLL_INTERVAL_MS);
    }

    const onStats = () => void pull();
    const onVis = () => {
      if (document.visibilityState === "visible") {
        void pull();
        startPollIfVisible();
      } else {
        clearPoll();
      }
    };

    void pull();
    startPollIfVisible();
    window.addEventListener("study-stats-changed", onStats);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      clearPoll();
      window.removeEventListener("study-stats-changed", onStats);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/rooms/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: joinCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to join room.");
        return;
      }
      router.push(`/room/${data.code}`);
    } finally {
      setBusy(false);
    }
  }

  const hasAnyRoom = myRooms.length > 0 || publicRooms.length > 0;

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden px-4 pb-6 pt-2 sm:px-6">
      {/* Page header */}
      <div className="mb-4 flex shrink-0 items-center gap-2 pt-2">
        <Video size={15} strokeWidth={1.6} className="text-muted-foreground opacity-70" />
        <h1 className="text-[14px] font-semibold tracking-tight text-foreground">Rooms</h1>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[minmax(24rem,1.28fr)_minmax(22rem,1.12fr)]">
        <section
          className="order-2 xl:order-1 min-h-0 overflow-hidden rounded-2xl border border-border/50 bg-[color:var(--panel-texture-bg)] bg-[image:var(--panel-texture-image)] bg-[length:200px_200px]
            p-3 shadow-[0_1px_2px_rgba(17,24,39,0.04),0_6px_18px_rgba(17,24,39,0.07)]"
        >
          <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3">
            <div
              className="rounded-lg border border-border/50 bg-background/90 p-4
                shadow-[0_1px_2px_rgba(17,24,39,0.03)]"
            >
              <p className="mb-3 flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
                <Hash size={12} strokeWidth={1.7} />
                Join by code
              </p>
              <form onSubmit={handleJoin} className="flex gap-2">
                <div className="relative flex min-w-0 flex-1 items-center">
                  <Hash
                    size={12}
                    strokeWidth={1.7}
                    className="absolute left-3 shrink-0 text-muted-foreground/60"
                  />
                  <input
                    type="text"
                    placeholder="Room code"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    maxLength={12}
                    required
                    className="w-full rounded-md border border-border/70 bg-background py-2 pl-8 pr-3 text-[12px]
                      text-foreground placeholder:text-muted-foreground/50
                      focus:outline-none focus:ring-2 focus:ring-ring/40 transition-shadow duration-150"
                  />
                </div>
                <motion.button
                  type="submit"
                  whileTap={{ scale: 0.96 }}
                  disabled={busy || !joinCode.trim()}
                  className="shrink-0 rounded-[6px] bg-cta px-4 py-2 text-[11.5px] font-medium text-cta-foreground
                    shadow-[0_1px_3px_rgba(17,24,39,0.1),inset_0_1px_0_rgba(255,255,255,0.12)]
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-opacity duration-150"
                >
                  Join
                </motion.button>
              </form>
              <AnimatePresence>
                {error && (
                  <motion.p
                    role="alert"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-2 text-[11px] text-destructive"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <div
              className="min-h-0 overflow-y-auto rounded-lg border border-border/50 bg-background p-3
                [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
                shadow-[0_1px_2px_rgba(17,24,39,0.03)]"
              style={{ msOverflowStyle: "none" }}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2 pb-0.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    Rooms List
                  </p>
                  <label className="relative">
                    <span className="sr-only">Choose room list</span>
                    <select
                      value={roomListView}
                      onChange={(e) => setRoomListView(e.target.value as "my" | "public")}
                      className="appearance-none rounded-[6px] border border-border/70 bg-background py-1 pl-2.5 pr-7 text-[10.5px] font-medium text-foreground
                        focus:outline-none focus:ring-2 focus:ring-ring/40"
                    >
                      <option value="public">Public Rooms</option>
                      <option value="my">My Rooms</option>

                    </select>
                    <ChevronDown
                      size={11}
                      className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                  </label>
                </div>

                {roomListView === "my" && myRooms.length > 0 && (
                  <section>
                    <div className="mb-2 flex items-center gap-2">
                      <Lock size={11} strokeWidth={1.7} className="text-muted-foreground/60" />
                      <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                        My Rooms
                      </h2>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      {myRooms.map((r, i) => (
                        <RoomCard
                          key={r.code}
                          code={r.code}
                          name={r.name}
                          memberCount={r.memberCount}
                          hostName={r.hostName}
                          role={r.role}
                          index={i}
                        />
                      ))}
                    </div>
                  </section>
                )}
                {roomListView === "public" && publicRooms.length > 0 && (
                  <section>
                    <div className="mb-2 flex items-center gap-2">
                      <Users size={11} strokeWidth={1.7} className="text-muted-foreground/60" />
                      <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                        Browse Public Rooms
                      </h2>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      {publicRooms.slice(0, 4).map((r, i) => (
                        <RoomCard
                          key={r.code}
                          code={r.code}
                          name={r.name}
                          memberCount={r.memberCount}
                          hostName={r.hostName}
                          index={i + myRooms.length}
                        />
                      ))}
                    </div>
                  </section>
                )}
                {roomListView === "my" && myRooms.length === 0 && hasAnyRoom && (
                  <div className="flex min-h-[7rem] flex-col items-center justify-center gap-1.5 rounded-lg border border-border/50 bg-muted/20">
                    <p className="text-[12px] text-muted-foreground">No joined rooms yet.</p>
                    <p className="text-[11px] text-muted-foreground/70">Switch to Public Rooms to explore.</p>
                  </div>
                )}
                {roomListView === "public" && publicRooms.length === 0 && hasAnyRoom && (
                  <div className="flex min-h-[7rem] flex-col items-center justify-center gap-1.5 rounded-lg border border-border/50 bg-muted/20">
                    <p className="text-[12px] text-muted-foreground">No public rooms available.</p>
                    <p className="text-[11px] text-muted-foreground/70">Try creating a new room from sidebar.</p>
                  </div>
                )}
                {!hasAnyRoom && (
                  <div className="flex min-h-[10rem] flex-col items-center justify-center gap-2 rounded-lg border border-border/50 bg-muted/20">
                    <Video size={18} strokeWidth={1.4} className="text-muted-foreground/60" />
                    <p className="text-[12px] text-muted-foreground">No rooms yet.</p>
                    <p className="text-[11px] text-muted-foreground/70">
                      Create one from the sidebar or join with a code above.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section
          className="order-1 xl:order-2 min-h-0 rounded-2xl border border-border/50 bg-[color:var(--panel-texture-bg)] bg-[image:var(--panel-texture-image)] bg-[length:200px_200px]
            xl:h-[88%] xl:self-center
            p-3 shadow-[0_1px_2px_rgba(17,24,39,0.04),0_6px_18px_rgba(17,24,39,0.07)]"
        >
          {displayBoards.length > 0 ? (
            <div className="h-full rounded-xl bg-background">
              <RoomLeaderboardCarousel boards={displayBoards} currentUserId={currentUserId} />
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-[12px] text-muted-foreground">
              Join or create a room to see live room leaderboards.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// — My/public rooms, join-by-code, navigation to room.
