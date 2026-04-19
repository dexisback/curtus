"use client";

import { useEffect, useRef, useState } from "react";
import { connectWithAuth } from "@/lib/socket";
import type { ChatMessage } from "./room-client";

type Props = {
  roomId: string;
  messages: ChatMessage[];
  currentUserId: string;
};

export default function Chat({ roomId, messages, currentUserId }: Props) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
      <ul style={{ maxHeight: 300, overflowY: "auto" }}>
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
