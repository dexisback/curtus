"use client";

import { useEffect, useRef, useState } from "react";
import { connectWithAuth } from "@/lib/socket";

type TimerStatus = "idle" | "running";

type LastSession = {
  durationMin: number;
  lifetimeFocusMinutes: number;
};

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

type TimerProps = {
  roomId?: string;
};

export default function Timer({ roomId }: TimerProps) {
  const [status, setStatus] = useState<TimerStatus>("idle");
  const [elapsedSec, setElapsedSec] = useState(0);
  const [lastSession, setLastSession] = useState<LastSession | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const socket = connectWithAuth();
    if (!socket) return;

    const onSessionLogged = (payload: {
      durationMin: number;
      lifetimeFocusMinutes: number;
      roomId: string | null;
    }) => {
      setLastSession({
        durationMin: payload.durationMin,
        lifetimeFocusMinutes: payload.lifetimeFocusMinutes,
      });
    };

    socket.on("session:logged", onSessionLogged);
    return () => {
      socket.off("session:logged", onSessionLogged);
    };
  }, []);

  // Clear interval on unmount — emit stopped if running
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);

      if (status === "running") {
        const socket = connectWithAuth();
        socket?.emit("session:stopped");
      }
    };
  }, [status]);

  function handleStart() {
    const socket = connectWithAuth();
    if (!socket) return;

    socket.emit("session:started", { roomId: roomId ?? null });
    setStatus("running");
    setLastSession(null);
    setElapsedSec(0);

    intervalRef.current = setInterval(() => {
      setElapsedSec((s) => s + 1);
    }, 1_000);
  }

  function handleStop() {
    const socket = connectWithAuth();
    if (!socket) return;

    socket.emit("session:stopped");
    setStatus("idle");

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setElapsedSec(0);
  }

  return (
    <div>
      <p>{status === "running" ? formatElapsed(elapsedSec) : "00:00"}</p>

      {status === "idle" ? (
        <button type="button" onClick={handleStart}>
          Start
        </button>
      ) : (
        <button type="button" onClick={handleStop}>
          Stop
        </button>
      )}

      {lastSession && (
        <p>
          Saved {lastSession.durationMin} min — lifetime: {lastSession.lifetimeFocusMinutes} min
        </p>
      )}
    </div>
  );
}
