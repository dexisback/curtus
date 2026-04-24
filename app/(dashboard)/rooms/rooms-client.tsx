"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, Hash, Lock, Users, Video } from "lucide-react";

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
      className="panel-texture group relative flex flex-col gap-3 rounded-xl border border-border/50 p-4
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
            className="shrink-0 rounded-full border border-border/60 bg-card/80 px-2 py-0.5 text-[9.5px] font-medium text-muted-foreground capitalize"
          >
            {role.toLowerCase()}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
          <Users size={11} strokeWidth={1.6} />
          <span className="tabular-nums">
            {memberCount} member{memberCount !== 1 ? "s" : ""}
          </span>
        </div>
        <motion.button
          type="button"
          whileTap={{ scale: 0.96 }}
          onClick={() => router.push(`/room/${code}`)}
          className="flex items-center gap-1.5 rounded-lg bg-cta px-3 py-1.5 text-[11px] font-medium text-cta-foreground
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

export default function RoomsClient({ publicRooms, myRooms }: Props) {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
    <div className="flex h-full min-h-0 w-full flex-col overflow-y-auto px-4 pb-8 pt-2 sm:px-6">
      {/* Page header */}
      <div className="mb-5 flex shrink-0 items-center gap-2 pt-2">
        <Video size={15} strokeWidth={1.6} className="text-muted-foreground opacity-70" />
        <h1 className="text-[14px] font-semibold tracking-tight text-foreground">Rooms</h1>
      </div>

      {/* Join by code */}
      <div
        className="panel-texture mb-6 shrink-0 rounded-2xl border border-border/50 p-4
          shadow-[0_1px_2px_rgba(17,24,39,0.04),0_6px_18px_rgba(17,24,39,0.07)]"
      >
        <p className="mb-3 text-[11px] font-medium text-muted-foreground">Join by code</p>
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
              className="w-full rounded-lg border border-border/70 bg-background py-2 pl-8 pr-3 text-[12px]
                text-foreground placeholder:text-muted-foreground/50
                focus:outline-none focus:ring-2 focus:ring-ring/40 transition-shadow duration-150"
            />
          </div>
          <motion.button
            type="submit"
            whileTap={{ scale: 0.96 }}
            disabled={busy || !joinCode.trim()}
            className="shrink-0 rounded-lg bg-cta px-4 py-2 text-[11.5px] font-medium text-cta-foreground
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

      {/* My rooms */}
      {myRooms.length > 0 && (
        <section className="mb-6">
          <div className="mb-3 flex items-center gap-2">
            <Lock size={11} strokeWidth={1.7} className="text-muted-foreground/60" />
            <h2 className="text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground">
              My Rooms
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
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

      {/* Public rooms */}
      {publicRooms.length > 0 && (
        <section className="mb-6">
          <div className="mb-3 flex items-center gap-2">
            <Users size={11} strokeWidth={1.7} className="text-muted-foreground/60" />
            <h2 className="text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground">
              Browse Public Rooms
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {publicRooms.map((r, i) => (
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

      {!hasAnyRoom && (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16">
          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-border/50 bg-muted/40">
            <Video size={18} strokeWidth={1.4} className="text-muted-foreground/60" />
          </div>
          <p className="text-[12px] text-muted-foreground">No rooms yet.</p>
          <p className="text-[11px] text-muted-foreground/70">
            Create one from the sidebar or join with a code above.
          </p>
        </div>
      )}
    </div>
  );
}
