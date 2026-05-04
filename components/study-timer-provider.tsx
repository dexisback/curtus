"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { connectWithAuth } from "@/lib/socket";

type StudyTimerState = {
  active: boolean;
  startedAtMs: number | null;
  redisAvailable: boolean;
  elapsedSeconds: number;
  busy: boolean;
  toggle: () => Promise<void>;
  refresh: () => Promise<void>;
};

const StudyTimerContext = createContext<StudyTimerState | null>(null);

function parseStartedMs(iso: string | null): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
}

export function StudyTimerProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState(false);
  const [startedAtMs, setStartedAtMs] = useState<number | null>(null);
  const [redisAvailable, setRedisAvailable] = useState(true);
  const [busy, setBusy] = useState(false);
  const [clock, setClock] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/study-timer", { credentials: "include", cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as {
        active?: boolean;
        startedAt?: string | null;
        redisAvailable?: boolean;
      };
      setRedisAvailable(data.redisAvailable !== false);
      setActive(Boolean(data.active));
      setStartedAtMs(parseStartedMs(data.startedAt ?? null));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    const onVis = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [refresh]);

  useEffect(() => {
    if (!active || startedAtMs === null) return;
    const id = setInterval(() => setClock((c) => c + 1), 1000);
    return () => clearInterval(id);
  }, [active, startedAtMs]);

  const elapsedSeconds = useMemo(() => {
    if (!active || startedAtMs === null) return 0;
    return Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000));
  }, [active, startedAtMs, clock]);

  const toggle = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const action = active ? "stop" : "start";
      const res = await fetch("/api/study-timer", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = (await res.json()) as { error?: string; startedAt?: string };
      if (!res.ok) {
        console.warn("[study-timer]", data.error ?? res.status);
        await refresh();
        return;
      }
      if (action === "start") {
        setActive(true);
        setStartedAtMs(parseStartedMs(data.startedAt ?? null) ?? Date.now());
      } else {
        setActive(false);
        setStartedAtMs(null);
      }
      await refresh();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("study-stats-changed"));
      }
      const sock = connectWithAuth();
      if (sock?.connected) sock.emit("presence:refresh");
    } finally {
      setBusy(false);
    }
  }, [active, busy, refresh]);

  const value = useMemo(
    () =>
      ({
        active,
        startedAtMs,
        redisAvailable,
        elapsedSeconds,
        busy,
        toggle,
        refresh,
      }) satisfies StudyTimerState,
    [active, startedAtMs, redisAvailable, elapsedSeconds, busy, toggle, refresh],
  );

  return <StudyTimerContext.Provider value={value}>{children}</StudyTimerContext.Provider>;
}

export function useStudyTimer() {
  const ctx = useContext(StudyTimerContext);
  if (!ctx) throw new Error("useStudyTimer must be used within StudyTimerProvider");
  return ctx;
}
