"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { connectWithAuth } from "@/lib/socket";
import Chat from "./chat";
import VideoPlayer from "@/features/dashboard/components/video-player";
import RoomLeaderboardCarousel, {
  type RoomTimerBoard,
  type RoomTimerMember,
} from "@/features/dashboard/components/room-leaderboard-carousel";
import { ArrowLeft, X } from "lucide-react";

export type Member = {
  id: string;
  name: string;
  image: string | null;
  role: string;
};

export type ChatMessage = {
  id: string;
  content: string;
  userId: string;
  userName: string;
  createdAt: string;
};

type Props = {
  roomId: string;
  code: string;
  name: string;
  currentUserId: string;
  isHost: boolean;
  initialMembers: Member[];
  initialMessages: ChatMessage[];
};

export default function RoomClient({
  roomId,
  code,
  name,
  currentUserId,
  isHost,
  initialMembers,
  initialMessages,
}: Props) {
  const router = useRouter();
  const [members] = useState<Member[]>(initialMembers);
  const [studyingUserIds, setStudyingUserIds] = useState<string[]>([]);
  const [videoEnabledUserIds, setVideoEnabledUserIds] = useState<string[]>([]);
  const [todayMinutes, setTodayMinutes] = useState<Record<string, number>>({});
  const [leaving, setLeaving] = useState(false);
  const [focusedMember, setFocusedMember] = useState<RoomTimerMember | null>(null);

  useEffect(() => {
    const socket = connectWithAuth();
    if (!socket) return;

    socket.emit("room:join", { roomId });

    const onPresence = (payload: {
      roomId: string;
      memberIds: string[];
      studyingUserIds: string[];
      videoEnabledUserIds: string[];
      todayMinutes: Record<string, number>;
    }) => {
      if (payload.roomId !== roomId) return;
      setStudyingUserIds(payload.studyingUserIds);
      setVideoEnabledUserIds(payload.videoEnabledUserIds);
      setTodayMinutes(payload.todayMinutes);
    };

    const onKicked = (payload: { roomId: string }) => {
      if (payload.roomId !== roomId) return;
      router.push("/rooms");
    };

    socket.on("presence", onPresence);
    socket.on("room:kicked", onKicked);

    return () => {
      socket.emit("room:leave", { roomId });
      socket.off("presence", onPresence);
      socket.off("room:kicked", onKicked);
    };
  }, [roomId, router]);

  async function handleLeave() {
    setLeaving(true);
    await fetch(`/api/rooms/${code}`, { method: "DELETE" });
    router.push("/rooms");
  }

  const board: RoomTimerBoard = {
    id: roomId,
    roomName: name,
    roomCode: code,
    members: members.map((m) => ({
      id: m.id,
      name: m.name,
      image: m.image,
      initials: m.name
        .split(/\s+/)
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase(),
      active: studyingUserIds.includes(m.id),
      startedAtIso: new Date(Date.now() - ((todayMinutes[m.id] ?? 10) % 120) * 60 * 1000).toISOString(),
      todayMinutes: todayMinutes[m.id] ?? 0,
    })),
  };

  const focusHasVideo = focusedMember
    ? videoEnabledUserIds.includes(focusedMember.id)
    : false;

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden px-4 pb-5 pt-3 sm:px-6">
      <div className="mb-3 flex items-center justify-between">
        <Link
          href="/rooms"
          className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-border/60 bg-card/80 px-3 text-[11.5px] font-medium text-foreground/90 transition-colors hover:bg-accent/60"
        >
          <ArrowLeft size={13} strokeWidth={1.8} />
          Back
        </Link>
        <div className="text-center">
          <h1 className="text-[14px] font-semibold tracking-tight text-foreground">{name}</h1>
          <p className="text-[10.5px] text-muted-foreground">Code: {code}</p>
        </div>
        <button
          type="button"
          onClick={handleLeave}
          disabled={leaving}
          className="h-9 rounded-[8px] bg-destructive/90 px-3 text-[11.5px] font-medium text-destructive-foreground disabled:opacity-60"
        >
          {isHost ? "Delete room" : "Leave room"}
        </button>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2.3fr)_minmax(19rem,0.9fr)]">
        <div className="min-h-0 rounded-2xl border border-border/50 bg-[color:var(--panel-texture-bg)] bg-[image:var(--panel-texture-image)] bg-[length:200px_200px] p-3 shadow-[0_1px_2px_rgba(17,24,39,0.04),0_6px_18px_rgba(17,24,39,0.07)]">
          <div className="flex h-full min-h-0 flex-col rounded-xl bg-background p-2">
            <AnimatePresence mode="wait" initial={false}>
              {focusedMember ? (
                <motion.div
                  key="focused-video"
                  initial={{ opacity: 0, scale: 0.96, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98, y: 6 }}
                  transition={{ duration: 0.22, ease: [0, 0, 0.58, 1] }}
                  className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-[10px] border border-border/50 bg-black"
                >
                  <button
                    type="button"
                    onClick={() => setFocusedMember(null)}
                    className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-background/80 text-foreground backdrop-blur-sm transition-colors hover:bg-background"
                    aria-label="Close focused preview"
                  >
                    <X size={14} />
                  </button>
                  <div className="flex min-h-0 flex-1 items-center justify-center">
                    {focusHasVideo ? (
                      <div className="h-full w-full bg-neutral-950 p-2">
                        <VideoPlayer />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3 text-center">
                        {focusedMember.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={focusedMember.image}
                            alt={focusedMember.name}
                            className="h-20 w-20 rounded-full object-cover [outline:1px_solid_rgba(255,255,255,0.16)]"
                          />
                        ) : (
                          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/10 text-[22px] font-semibold text-white">
                            {focusedMember.initials}
                          </div>
                        )}
                        <p className="text-[12px] text-white/80">
                          {focusedMember.name} has video off. Showing profile.
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="pointer-events-none absolute bottom-3 left-0 right-0 flex justify-center">
                    <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/15 bg-black/50 px-3 py-2 text-[11px] text-white/80 backdrop-blur-md">
                      <span className="rounded-full bg-white/10 px-2 py-1">Mic</span>
                      <button
                        type="button"
                        className="rounded-full bg-white/10 px-2 py-1 transition-colors hover:bg-white/20"
                        onClick={() => {
                          const isMe = focusedMember.id === currentUserId;
                          if (!isMe) return;
                          const nextEnabled = !videoEnabledUserIds.includes(currentUserId);
                          const socket = connectWithAuth();
                          socket?.emit("room:video-state", { roomId, enabled: nextEnabled });
                        }}
                      >
                        {focusedMember.id === currentUserId
                          ? videoEnabledUserIds.includes(currentUserId)
                            ? "Cam on"
                            : "Cam off"
                          : focusHasVideo
                            ? "Cam on"
                            : "Cam off"}
                      </button>
                      <span className="rounded-full bg-white/10 px-2 py-1">Share</span>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="leaderboard-grid"
                  initial={{ opacity: 0, scale: 0.98, y: 6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98, y: 6 }}
                  transition={{ duration: 0.2, ease: [0, 0, 0.58, 1] }}
                  className="min-h-0 flex-1"
                >
                  <RoomLeaderboardCarousel
                    boards={[board]}
                    onMemberClick={(member) => setFocusedMember(member)}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="min-h-0 rounded-2xl border border-border/50 bg-[color:var(--panel-texture-bg)] bg-[image:var(--panel-texture-image)] bg-[length:200px_200px] p-3 shadow-[0_1px_2px_rgba(17,24,39,0.04),0_6px_18px_rgba(17,24,39,0.07)]">
          <div className="flex h-full min-h-0 flex-col rounded-xl bg-background p-3">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Chat panel
            </p>
            <Chat
              roomCode={code}
              roomId={roomId}
              messages={initialMessages}
              currentUserId={currentUserId}
            />
          </div>
        </div>
      </div>

    </div>
  );
}
