'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { requestPresenceRefresh } from '@/lib/socket';
import { TIMER_POLL_INTERVAL_MS } from '@/lib/timer-sync';
import {
  normalizeTimerPayload,
  reconcileTodaySeconds,
  type TimerPayload,
} from '@/lib/timer-client-state';

type StudyTimerState = {
  active: boolean;
  startedAtMs: number | null;
  todaySeconds: number;
  dayKey: string | null;
  redisAvailable: boolean;
  elapsedSeconds: number;
  busy: boolean;
  toggle: () => Promise<void>;
  refresh: () => Promise<void>;
};

const StudyTimerContext = createContext<StudyTimerState | null>(null);

export function StudyTimerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [active, setActive] = useState(false);
  const [startedAtMs, setStartedAtMs] = useState<number | null>(null);
  const [todaySeconds, setTodaySeconds] = useState(0);
  const [dayKey, setDayKey] = useState<string | null>(null);
  const [redisAvailable, setRedisAvailable] = useState(true);
  const [busy, setBusy] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/timer-state', {
        credentials: 'include',
        cache: 'no-store',
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        timer?: TimerPayload;
      };
      const next = normalizeTimerPayload(data.timer);
      setRedisAvailable(next.redisAvailable);
      setActive(next.active);
      setStartedAtMs(next.startedAtMs);
      setDayKey((prevDayKey) => {
        setTodaySeconds((prevSeconds) =>
          reconcileTodaySeconds({
            previousDayKey: prevDayKey,
            previousTodaySeconds: prevSeconds,
            incomingDayKey: next.dayKey,
            incomingTodaySeconds: next.todaySeconds,
          }),
        );
        return next.dayKey;
      });
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);
    const onVis = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [refresh]);

  useEffect(() => {
    let id: ReturnType<typeof setInterval> | undefined;

    function clearPoll() {
      if (id !== undefined) {
        clearInterval(id);
        id = undefined;
      }
    }

    function startPollIfVisible() {
      clearPoll();
      if (
        typeof document === 'undefined' ||
        document.visibilityState !== 'visible'
      )
        return;
      id = setInterval(() => void refresh(), TIMER_POLL_INTERVAL_MS);
    }

    startPollIfVisible();

    const onVis = () => {
      if (document.visibilityState === 'visible') {
        void refresh();
        startPollIfVisible();
      } else {
        clearPoll();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      clearPoll();
    };
  }, [refresh]);

  useEffect(() => {
    if (!active || startedAtMs === null) return;
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active, startedAtMs]);

  const elapsedSeconds = useMemo(() => {
    if (!active || startedAtMs === null) return 0;
    return Math.max(0, Math.floor((nowMs - startedAtMs) / 1000));
  }, [active, startedAtMs, nowMs]);

  const toggle = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const action = active ? 'stop' : 'start';
      const res = await fetch('/api/study-timer', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = (await res.json()) as {
        error?: string;
        timer?: TimerPayload;
        session?: {
          durationSec?: number;
        };
      };
      if (!res.ok) {
        console.warn('[study-timer]', data.error ?? res.status);
        await refresh();
        return;
      }
      const next = normalizeTimerPayload(data.timer);
      if (data.timer) {
        setActive(next.active);
        setStartedAtMs(next.startedAtMs);
        // Stop responses can occasionally race with redis read-after-write.
        // Reconcile locally using authoritative returned durationSec so UI never regresses.
        if (action === 'stop') {
          const durationSec = Math.max(
            0,
            Math.floor(data.session?.durationSec ?? 0),
          );
          setTodaySeconds((prev) =>
            Math.max(next.todaySeconds, prev + durationSec),
          );
        } else {
          setTodaySeconds(next.todaySeconds);
        }
        setDayKey(next.dayKey);
        setRedisAvailable(next.redisAvailable);
      }
      // Avoid immediate re-read clobbering newer local state; periodic/focus refresh still converges.
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('study-stats-changed'));
      }
      requestPresenceRefresh();
    } finally {
      setBusy(false);
    }
  }, [active, busy, refresh]);

  const value = useMemo(
    () =>
      ({
        active,
        startedAtMs,
        todaySeconds,
        dayKey,
        redisAvailable,
        elapsedSeconds,
        busy,
        toggle,
        refresh,
      }) satisfies StudyTimerState,
    [
      active,
      startedAtMs,
      todaySeconds,
      dayKey,
      redisAvailable,
      elapsedSeconds,
      busy,
      toggle,
      refresh,
    ],
  );

  return (
    <StudyTimerContext.Provider value={value}>
      {children}
    </StudyTimerContext.Provider>
  );
}

export function useStudyTimer() {
  const ctx = useContext(StudyTimerContext);
  if (!ctx)
    throw new Error('useStudyTimer must be used within StudyTimerProvider');
  return ctx;
}
