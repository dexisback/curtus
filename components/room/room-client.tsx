"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { connectWithAuth } from "@/lib/socket";
import Timer from "@/components/timer";
import MemberList from "./member-list";
import Chat from "./chat";
import RoomLeaderboardCarousel, {
  type RoomTimerBoard,
} from "@/features/dashboard/components/room-leaderboard-carousel";
import { Maximize2 } from "lucide-react";

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
  const [todayMinutes, setTodayMinutes] = useState<Record<string, number>>({});
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const socket = connectWithAuth();
    if (!socket) return;

    socket.emit("room:join", { roomId });

    const onPresence = (payload: {
      roomId: string;
      memberIds: string[];
      studyingUserIds: string[];
      todayMinutes: Record<string, number>;
    }) => {
      if (payload.roomId !== roomId) return;
      setStudyingUserIds(payload.studyingUserIds);
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

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden px-4 pb-5 pt-3 sm:px-6">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h1 className="text-[14px] font-semibold tracking-tight text-foreground">{name}</h1>
          <p className="text-[11px] text-muted-foreground">Code: {code}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/room/${code}/video-call`}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-border/60 bg-card/80 px-3 text-[11px] font-medium text-foreground/90 hover:bg-accent/60"
          >
            <Maximize2 size={12} strokeWidth={1.8} />
            Enter full screen
          </Link>
          <button
            type="button"
            onClick={handleLeave}
            disabled={leaving}
            className="h-9 rounded-lg bg-destructive/90 px-3 text-[11px] font-medium text-destructive-foreground disabled:opacity-60"
          >
            {isHost ? "Delete room" : "Leave room"}
          </button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-4">
        <div className="bg-[color:var(--panel-texture-bg)] bg-[image:var(--panel-texture-image)] bg-[length:200px_200px] min-h-0 rounded-2xl border border-border/50 p-3">
          <div className="h-full rounded-xl bg-background">
            <RoomLeaderboardCarousel boards={[board]} />
          </div>
        </div>

        <div className="grid min-h-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <div className="bg-[color:var(--panel-texture-bg)] bg-[image:var(--panel-texture-image)] bg-[length:200px_200px] min-h-0 rounded-2xl border border-border/50 p-4">
            <p className="mb-2 text-[11px] font-medium text-muted-foreground">Room Timer</p>
            <Timer roomId={roomId} />
          </div>
          <div className="bg-[color:var(--panel-texture-bg)] bg-[image:var(--panel-texture-image)] bg-[length:200px_200px] min-h-0 rounded-2xl border border-border/50 p-4">
            <p className="mb-2 text-[11px] font-medium text-muted-foreground">Members</p>
            <MemberList
              members={members}
              studyingUserIds={studyingUserIds}
              todayMinutes={todayMinutes}
              currentUserId={currentUserId}
            />
          </div>
          <div className="bg-[color:var(--panel-texture-bg)] bg-[image:var(--panel-texture-image)] bg-[length:200px_200px] min-h-0 rounded-2xl border border-border/50 p-4">
            <p className="mb-2 text-[11px] font-medium text-muted-foreground">Live Chat</p>
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
