"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { connectWithAuth } from "@/lib/socket";
import Timer from "@/components/timer";
import MemberList from "./member-list";
import Chat from "./chat";

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
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
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

    const onChatMessage = (payload: ChatMessage & { roomId?: string }) => {
      if (payload.roomId && payload.roomId !== roomId) return;
      setMessages((prev) => [...prev, payload]);
    };

    socket.on("presence", onPresence);
    socket.on("chat:message", onChatMessage);

    return () => {
      socket.emit("room:leave", { roomId });
      socket.off("presence", onPresence);
      socket.off("chat:message", onChatMessage);
    };
  }, [roomId]);

  async function handleLeave() {
    setLeaving(true);
    await fetch(`/api/rooms/${code}`, { method: "DELETE" });
    router.push("/rooms");
  }

  return (
    <div>
      <h1>{name}</h1>
      <p>Code: {code}</p>

      <button type="button" onClick={handleLeave} disabled={leaving}>
        {isHost ? "Delete room" : "Leave room"}
      </button>

      <div>
        <h2>Timer</h2>
        <Timer roomId={roomId} />
      </div>

      <div>
        <h2>Members</h2>
        <MemberList
          members={members}
          studyingUserIds={studyingUserIds}
          todayMinutes={todayMinutes}
          currentUserId={currentUserId}
        />
      </div>

      <div>
        <h2>Chat</h2>
        <Chat
          roomId={roomId}
          messages={messages}
          currentUserId={currentUserId}
        />
      </div>
    </div>
  );
}
