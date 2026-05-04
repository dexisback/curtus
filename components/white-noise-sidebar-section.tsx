"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, ChevronUp, Music2, Pause, Play, Volume2 } from "lucide-react";
import { useSound } from "@/components/sound-provider";
import { useWhiteNoise } from "@/components/white-noise-provider";
import { DEVELOPER_LIKES_AMBIENT, type WhiteNoiseToneId } from "@/lib/ambient-sounds";
import { DURATION, EASE_OUT_SMOOTH } from "@/lib/ui-motion";

const TONES: Array<{ id: WhiteNoiseToneId; label: string }> = [
  { id: "paris-cafe", label: "Paris Cafe" },
  { id: "beach", label: "Beach" },
  { id: "river", label: "River" },
];

const EXPANDED_KEY = "swm:white-noise-dock-expanded";

function readExpandedDefault(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const v = localStorage.getItem(EXPANDED_KEY);
    if (v === "0") return false;
    if (v === "1") return true;
  } catch {
    /* ignore */
  }
  return true;
}

function toneChipClass(active: boolean) {
  return (
    "h-9 rounded-lg border px-2.5 text-left text-[11px] transition-colors " +
    (active
      ? "border-cta/45 bg-cta/10 text-foreground"
      : "border-border/60 bg-card/50 text-foreground/75 hover:bg-accent/55")
  );
}

function nowPlayingLabel(
  previewSoundId: string | null,
  currentTone: WhiteNoiseToneId,
  isPlaying: boolean,
): string {
  if (previewSoundId) {
    const dev = DEVELOPER_LIKES_AMBIENT.find((s) => s.id === previewSoundId);
    if (dev) return dev.label;
  }
  const tone = TONES.find((t) => t.id === currentTone);
  const base = tone?.label ?? "Ambience";
  if (!isPlaying) return `${base} · paused`;
  return base;
}

export default function WhiteNoiseSidebarSection() {
  const { play } = useSound();
  const {
    currentTone,
    isPlaying,
    previewSoundId,
    volume,
    ready,
    error,
    initAudio,
    setTone,
    toggle,
    setVolume,
  } = useWhiteNoise();

  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    setExpanded(readExpandedDefault());
  }, []);

  const persistExpanded = useCallback((next: boolean) => {
    setExpanded(next);
    try {
      localStorage.setItem(EXPANDED_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  const label = nowPlayingLabel(previewSoundId, currentTone, isPlaying);

  return (
    <div
      className="mt-2 rounded-2xl border border-border/55 bg-[color:var(--panel-texture-bg)] bg-[image:var(--panel-texture-image)] bg-[length:200px_200px] p-2
        shadow-[0_1px_2px_rgba(17,24,39,0.04),0_4px_14px_rgba(17,24,39,0.06)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.2),0_4px_14px_rgba(0,0,0,0.18)]"
    >
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/50 bg-foreground/[0.04] text-foreground/85">
            <Music2 size={16} strokeWidth={1.75} aria-hidden />
          </span>
          <p className="min-w-0 truncate text-[11px] font-medium leading-tight tracking-tight text-foreground">
            {label}
          </p>
        </div>
        <motion.button
          type="button"
          whileTap={{ scale: 0.96 }}
          onClick={() => {
            play("tap");
            void initAudio();
            void toggle();
          }}
          className="inline-flex h-9 min-w-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-transparent text-foreground/85 transition-colors hover:bg-accent/60"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause size={14} /> : <Play size={14} className="translate-x-[0.5px]" />}
        </motion.button>
        <motion.button
          type="button"
          whileTap={{ scale: 0.96 }}
          onClick={() => persistExpanded(!expanded)}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-transparent text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
          aria-expanded={expanded}
          aria-label={expanded ? "Collapse sound dock" : "Expand sound dock"}
        >
          {expanded ? <ChevronDown size={16} strokeWidth={1.75} /> : <ChevronUp size={16} strokeWidth={1.75} />}
        </motion.button>
      </div>

      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            key="expanded"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: DURATION.medium, ease: EASE_OUT_SMOOTH }}
            className="overflow-hidden"
          >
            <div className="pt-2">
              {!ready && (
                <p className="mb-2 text-[10px] text-muted-foreground">Tap play to initialize audio.</p>
              )}

              <div className="grid grid-cols-1 gap-1.5">
                {TONES.map((tone) => {
                  const active = tone.id === currentTone;
                  return (
                    <motion.button
                      key={tone.id}
                      type="button"
                      whileTap={{ scale: 0.96 }}
                      onClick={() => {
                        play("tap");
                        void initAudio();
                        void setTone(tone.id);
                      }}
                      className={toneChipClass(active)}
                      aria-pressed={active}
                    >
                      {tone.label}
                    </motion.button>
                  );
                })}
              </div>

              <label className="mt-2.5 block">
                <span className="mb-1 inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Volume2 size={11} />
                  Volume
                </span>
                <input
                  type="range"
                  min={0.05}
                  max={1}
                  step={0.01}
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="h-2 w-full cursor-pointer accent-[var(--color-cta)]"
                  aria-label="Ambience volume"
                />
              </label>
              {error ? <p className="mt-2 text-[10px] text-destructive">{error}</p> : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

// — Floating sidebar dock: now-playing label, play/pause, collapsible tone list + volume.
