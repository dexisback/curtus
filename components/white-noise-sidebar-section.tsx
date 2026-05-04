"use client";

import { motion } from "motion/react";
import { Pause, Play, Volume2, Waves } from "lucide-react";
import { useSound } from "@/components/sound-provider";
import { useWhiteNoise } from "@/components/white-noise-provider";
import { type WhiteNoiseToneId } from "@/lib/ambient-sounds";

const TONES: Array<{ id: WhiteNoiseToneId; label: string }> = [
  { id: "paris-cafe", label: "Paris Cafe" },
  { id: "beach", label: "Beach" },
  { id: "river", label: "River" },
];

export default function WhiteNoiseSidebarSection() {
  const { play } = useSound();
  const { currentTone, isPlaying, volume, ready, error, initAudio, setTone, toggle, setVolume } = useWhiteNoise();

  return (
    <div
      className="mt-3 rounded-xl border border-border/55 bg-[color:var(--panel-texture-bg)] bg-[image:var(--panel-texture-image)] bg-[length:200px_200px] p-2.5
        shadow-[0_1px_2px_rgba(17,24,39,0.04),0_4px_14px_rgba(17,24,39,0.06)]"
    >
      <div className="mb-2 flex items-center justify-between">
        <p className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.09em] text-muted-foreground">
          <Waves size={12} />
          White noise
        </p>
        <motion.button
          type="button"
          whileTap={{ scale: 0.96 }}
          onClick={() => {
            play("tap");
            void initAudio();
            void toggle();
          }}
          className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-border/65 bg-background text-foreground/85 transition-colors hover:bg-accent/60"
          aria-label={isPlaying ? "Pause white noise" : "Play white noise"}
        >
          {isPlaying ? <Pause size={14} /> : <Play size={14} className="translate-x-[0.5px]" />}
        </motion.button>
      </div>
      {!ready && (
        <p className="mb-2 text-[10px] text-muted-foreground">Click play to initialize audio output.</p>
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
              className={
                "h-9 rounded-lg border px-2.5 text-left text-[11px] transition-colors " +
                (active
                  ? "border-cta/45 bg-cta/10 text-foreground"
                  : "border-border/60 bg-background text-foreground/75 hover:bg-accent/55")
              }
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
          aria-label="White noise volume"
        />
      </label>
      {error && <p className="mt-2 text-[10px] text-destructive">{error}</p>}
    </div>
  );
}

// — Sidebar white-noise controls: pick tone, play/pause, persist volume.
