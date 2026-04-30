"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { connectWithAuth } from "@/lib/socket";
import type { ChatMessage } from "./room-client";

type Props = {
  roomCode: string;
  roomId: string;
  messages: ChatMessage[];
  currentUserId: string;
};

export default function Chat({ roomCode, roomId, messages: initialMessages, currentUserId }: Props) {
  type ChatItem = ChatMessage & {
    status?: "sending" | "sent" | "failed";
    error?: string;
  };

  const [messages, setMessages] = useState<ChatItem[]>(
    initialMessages.map((message) => ({ ...message, status: "sent" })),
  );
  const [input, setInput] = useState("");
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [olderCursor, setOlderCursor] = useState<string | null>(
    initialMessages.length > 0 ? initialMessages[0].id : null,
  );
  const [hasOlder, setHasOlder] = useState(initialMessages.length >= 50);
  const listRef = useRef<HTMLUListElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pendingRef = useRef<Map<string, { roomId: string; content: string; attempts: number }>>(new Map());

  const mergeMessage = useCallback((message: ChatMessage, status: ChatItem["status"] = "sent") => {
    setMessages((prev) => {
      const existingIndex = prev.findIndex((item) =>
        item.id === message.id ||
        (message.clientNonce && item.clientNonce === message.clientNonce)
      );
      if (existingIndex === -1) return [...prev, { ...message, status }];
      const next = [...prev];
      next[existingIndex] = { ...next[existingIndex], ...message, status, error: undefined };
      return next;
    });
  }, []);

  const markFailed = useCallback((clientNonce: string, error = "Failed to send") => {
    setMessages((prev) =>
      prev.map((message) =>
        message.clientNonce === clientNonce
          ? { ...message, status: "failed", error }
          : message,
      ),
    );
  }, []);

  const sendPending = useCallback((clientNonce: string) => {
    const pending = pendingRef.current.get(clientNonce);
    const socket = connectWithAuth();
    if (!pending || !socket) {
      markFailed(clientNonce);
      return;
    }

    pending.attempts += 1;
    setMessages((prev) =>
      prev.map((message) =>
        message.clientNonce === clientNonce
          ? { ...message, status: "sending", error: undefined }
          : message,
      ),
    );

    const timeout = window.setTimeout(() => {
      if (pending.attempts < 3 && socket.connected) {
        sendPending(clientNonce);
        return;
      }
      markFailed(clientNonce, "Failed to send");
    }, 8_000);

    socket.emit(
      "chat:send",
      { roomId: pending.roomId, content: pending.content, clientNonce },
      (response: {
        ok: boolean;
        message?: ChatMessage;
        error?: string;
      }) => {
        window.clearTimeout(timeout);
        if (!response.ok || !response.message) {
          if (pending.attempts < 3 && socket.connected) {
            window.setTimeout(() => sendPending(clientNonce), 900 * pending.attempts);
            return;
          }
          markFailed(clientNonce, response.error ?? "Failed to send");
          return;
        }

        pendingRef.current.delete(clientNonce);
        mergeMessage(response.message, "sent");
      },
    );
  }, [markFailed, mergeMessage]);

  // Sync live messages
  useEffect(() => {
    const socket = connectWithAuth();
    if (!socket) return;

    const onChatMessage = (payload: ChatMessage & { roomId?: string }) => {
      if (payload.roomId && payload.roomId !== roomId) return;
      if (payload.clientNonce) pendingRef.current.delete(payload.clientNonce);
      mergeMessage(payload, "sent");
    };

    const retryPending = () => {
      for (const nonce of pendingRef.current.keys()) sendPending(nonce);
    };

    socket.on("chat:message", onChatMessage);
    socket.on("connect", retryPending);
    return () => {
      socket.off("chat:message", onChatMessage);
      socket.off("connect", retryPending);
    };
  }, [mergeMessage, roomId, sendPending]);

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

      setMessages((prev) => [
        ...data.items.reverse().map((message) => ({ ...message, status: "sent" as const })),
        ...prev,
      ]);
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

    const clientNonce = crypto.randomUUID();
    const now = new Date().toISOString();
    pendingRef.current.set(clientNonce, { roomId, content, attempts: 0 });
    setMessages((prev) => [
      ...prev,
      {
        id: `local:${clientNonce}`,
        content,
        clientNonce,
        userId: currentUserId,
        userName: "You",
        createdAt: now,
        status: "sending",
      },
    ]);
    setInput("");
    sendPending(clientNonce);
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
            {msg.userId === currentUserId && msg.status && msg.status !== "sent" && (
              <button
                type="button"
                onClick={() => {
                  if (msg.clientNonce && msg.status === "failed") sendPending(msg.clientNonce);
                }}
                className="mt-0.5 text-[10px] text-muted-foreground"
              >
                {msg.status === "sending" ? "Sending..." : `Failed. ${msg.clientNonce ? "Retry" : ""}`}
              </button>
            )}
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
