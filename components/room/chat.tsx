"use client";

import { useEffect, useRef, useState } from "react";
import { connectWithAuth } from "@/lib/socket";
import type { ChatMessage } from "./room-client";

type Props = {
  roomCode: string;
  roomId: string;
  messages: ChatMessage[];
  currentUserId: string;
};

export default function Chat({ roomCode, roomId, messages: initialMessages, currentUserId }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [olderCursor, setOlderCursor] = useState<string | null>(
    initialMessages.length > 0 ? initialMessages[0].id : null,
  );
  const [hasOlder, setHasOlder] = useState(initialMessages.length >= 50);
  const listRef = useRef<HTMLUListElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Sync live messages
  useEffect(() => {
    const socket = connectWithAuth();
    if (!socket) return;

    const onChatMessage = (payload: ChatMessage & { roomId?: string }) => {
      if (payload.roomId && payload.roomId !== roomId) return;
      setMessages((prev) => [...prev, payload]);
    };

    socket.on("chat:message", onChatMessage);
    return () => { socket.off("chat:message", onChatMessage); };
  }, [roomId]);

  // Scroll to bottom on new messages only if already near bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function loadOlderMessages() {
    if (!olderCursor || loadingOlder) return;
    setLoadingOlder(true);

    try {
      const res = await fetch(
        `/api/rooms/${roomCode}/messages?cursor=${olderCursor}&limit=50`,
      );
      if (!res.ok) return;
      const data = await res.json() as {
        items: ChatMessage[];
        nextCursor: string | null;
      };

      setMessages((prev) => [...data.items.reverse(), ...prev]);
      setOlderCursor(data.nextCursor);
      setHasOlder(data.nextCursor !== null);
    } finally {
      setLoadingOlder(false);
    }
  }

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const content = input.trim();
    if (!content) return;

    const socket = connectWithAuth();
    if (!socket) return;

    socket.emit("chat:send", { roomId, content });
    setInput("");
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {hasOlder && (
        <button
          type="button"
          onClick={loadOlderMessages}
          disabled={loadingOlder}
          className="mb-1 w-full rounded-[8px] border border-border/50 bg-background/70 py-1 text-[10.5px] text-muted-foreground transition-colors hover:bg-accent/40"
        >
          {loadingOlder ? "Loading…" : "Load older messages"}
        </button>
      )}

      <ul
        ref={listRef}
        className="min-h-0 flex-1 space-y-1.5 overflow-y-auto rounded-[10px] border border-border/50 bg-background/70 p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ msOverflowStyle: "none" }}
      >
        {messages.map((msg) => (
          <li key={msg.id} className="rounded-[8px] border border-border/40 bg-background px-2 py-1.5">
            <p className="truncate text-[10px] font-medium text-muted-foreground">
              {msg.userId === currentUserId ? "You" : msg.userName}
            </p>
            <p className="text-[11.5px] text-foreground">{msg.content}</p>
          </li>
        ))}
        <div ref={bottomRef} />
      </ul>

      <form onSubmit={handleSend} className="mt-2 flex items-center gap-2">
        <input
          type="text"
          placeholder="Say something..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={1000}
          className="h-9 min-w-0 flex-1 rounded-[8px] border border-border/60 bg-background px-3 text-[12px] text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring/35"
        />
        <button
          type="submit"
          className="h-9 rounded-[8px] border border-border/60 bg-card/90 px-3 text-[11.5px] font-medium text-foreground transition-colors hover:bg-accent/60"
        >
          Send
        </button>
      </form>
    </div>
  );
}
