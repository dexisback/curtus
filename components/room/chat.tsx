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
    <div>
      {hasOlder && (
        <button
          type="button"
          onClick={loadOlderMessages}
          disabled={loadingOlder}
          className="text-xs text-muted-foreground w-full py-1"
        >
          {loadingOlder ? "Loading…" : "Load older messages"}
        </button>
      )}

      <ul ref={listRef} style={{ maxHeight: 300, overflowY: "auto" }}>
        {messages.map((msg) => (
          <li key={msg.id}>
            <strong>{msg.userId === currentUserId ? "You" : msg.userName}</strong>: {msg.content}
          </li>
        ))}
        <div ref={bottomRef} />
      </ul>

      <form onSubmit={handleSend}>
        <input
          type="text"
          placeholder="Say something..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={1000}
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}
