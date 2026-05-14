'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { useStudyTimer } from '@/components/study-timer-provider';

const ONE_HOUR_SECONDS = 60 * 60;
const RESPONSE_WINDOW_SECONDS = 120;

type Props = {
  /** Seconds into a single running session before prompting. Default: 3600 (1h). */
  promptAfterSeconds?: number;
  /** Time allowed to confirm before auto-stopping. Default: 120. */
  responseWindowSeconds?: number;
};

export default function StudyTimerInactivityGuard({
  promptAfterSeconds = ONE_HOUR_SECONDS,
  responseWindowSeconds = RESPONSE_WINDOW_SECONDS,
}: Props) {
  const { active, elapsedSeconds, busy, toggle } = useStudyTimer();

  const [open, setOpen] = useState(false);
  const [deadlineMs, setDeadlineMs] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  // Tracks the next elapsed-second threshold at which we should prompt.
  const nextPromptAtSecondsRef = useRef<number>(promptAfterSeconds);
  const autoStopFiredRef = useRef(false);

  // When timer stops, reset schedule (avoid redundant setState).
  useEffect(() => {
    if (active) return;
    nextPromptAtSecondsRef.current = promptAfterSeconds;
    autoStopFiredRef.current = false;
    queueMicrotask(() => {
      setOpen(false);
      setDeadlineMs(null);
    });
  }, [active, promptAfterSeconds]);

  // Open prompt when we cross the next threshold.
  useEffect(() => {
    if (!active) return;
    if (open) return;

    const nextAt = nextPromptAtSecondsRef.current;
    if (elapsedSeconds < nextAt) return;

    autoStopFiredRef.current = false;
    const now = Date.now();
    queueMicrotask(() => {
      setOpen(true);
      setNowMs(now);
      setDeadlineMs(now + responseWindowSeconds * 1000);
    });
  }, [active, elapsedSeconds, open, responseWindowSeconds]);

  // Tick while open for countdown.
  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => setNowMs(Date.now()), 250);
    return () => clearInterval(id);
  }, [open]);

  const remainingSeconds = useMemo(() => {
    if (!open || deadlineMs === null) return null;
    return Math.max(0, Math.ceil((deadlineMs - nowMs) / 1000));
  }, [deadlineMs, nowMs, open]);

  // Auto-stop after deadline.
  useEffect(() => {
    if (!open) return;
    if (!active) return;
    if (deadlineMs === null) return;
    if (autoStopFiredRef.current) return;
    if (nowMs < deadlineMs) return;

    autoStopFiredRef.current = true;

    // Close prompt without setState-in-effect lint: schedule via microtask.
    queueMicrotask(() => {
      setOpen(false);
      setDeadlineMs(null);
    });

    void (async () => {
      try {
        await toggle();
      } catch {
        // ignore
      }
    })();
  }, [active, deadlineMs, nowMs, open, toggle]);

  const scheduleNextPrompt = () => {
    const current = Math.max(0, elapsedSeconds);
    const nextMultiple =
      (Math.floor(current / promptAfterSeconds) + 1) * promptAfterSeconds;
    nextPromptAtSecondsRef.current = Math.max(nextMultiple, current + 1);
  };

  const confirmStillWorking = () => {
    scheduleNextPrompt();
    setOpen(false);
    setDeadlineMs(null);
  };

  const stopNow = async () => {
    scheduleNextPrompt();
    setOpen(false);
    setDeadlineMs(null);
    autoStopFiredRef.current = true;
    if (active) await toggle();
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="study-timer-guard"
          className="fixed inset-0 z-[160] flex items-end justify-center p-4 sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: [0, 0, 0.58, 1] }}
        >
          <motion.div
            className="absolute inset-0 bg-black/35 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            aria-hidden
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="study-timer-guard-title"
            initial={{ y: 10, opacity: 0, scale: 0.985 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 8, opacity: 0, scale: 0.985 }}
            transition={{ type: 'spring', duration: 0.28, bounce: 0 }}
            className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-border/40 bg-card/96 shadow-[0_2px_8px_rgb(0_0_0/0.18),0_20px_50px_rgb(0_0_0/0.22)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-border/50">
              <h2
                id="study-timer-guard-title"
                className="text-[14px] font-semibold tracking-tight text-foreground"
              >
                Still studying?
              </h2>
              <p className="mt-1 text-[12px] text-muted-foreground">
                Your timer has been running for over 1 hour. Confirm you’re
                still working to keep it going.
              </p>
            </div>

            <div className="px-5 py-4">
              <p className="text-[12px] text-muted-foreground">
                Auto-stopping in{' '}
                <span className="font-medium text-foreground tabular-nums">
                  {remainingSeconds ?? responseWindowSeconds}s
                </span>
              </p>

              <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  className="h-10 rounded-lg border border-border/60 bg-background/80 px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent/70 disabled:opacity-60"
                  disabled={busy}
                  onClick={() => void stopNow()}
                >
                  Stop timer
                </button>
                <button
                  type="button"
                  className="h-10 rounded-lg bg-foreground px-4 text-sm font-semibold text-background transition-colors hover:bg-foreground/90 disabled:opacity-60"
                  disabled={busy}
                  onClick={confirmStillWorking}
                >
                  Yes, I’m still working
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

// — Prompts every `promptAfterSeconds` during a continuous running session. Auto-stops after `responseWindowSeconds`.
