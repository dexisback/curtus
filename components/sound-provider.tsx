"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";

type SoundKind =
  | "tap"
  | "toggleOn"
  | "toggleOff"
  | "success"
  | "error"
  | "modalOpen"
  | "modalClose";

type SoundContextValue = {
  enabled: boolean;
  toggleEnabled: () => void;
  setEnabled: (value: boolean) => void;
  play: (kind: SoundKind, opts?: { force?: boolean }) => void;
};

const SoundContext = createContext<SoundContextValue | null>(null);
const STORAGE_KEY = "svm-sound-enabled";

function isReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function createContextSafe(ctxRef: MutableRefObject<AudioContext | null>) {
  if (typeof window === "undefined") return null;
  const Ctx = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!ctxRef.current) ctxRef.current = new Ctx();
  return ctxRef.current;
}

function makeEnv(
  ctx: AudioContext,
  destination: AudioNode,
  {
    gain = 0.12,
    attack = 0.0,
    decay = 0.06,
    release = 0.02,
    delay = 0,
  }: { gain?: number; attack?: number; decay?: number; release?: number; delay?: number },
) {
  const node = ctx.createGain();
  node.connect(destination);
  const t = ctx.currentTime + delay;
  node.gain.setValueAtTime(0.0001, t);
  node.gain.linearRampToValueAtTime(gain, t + attack);
  node.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay + release);
  return { node, startAt: t, endAt: t + attack + decay + release + 0.01 };
}

function playTone(
  ctx: AudioContext,
  destination: AudioNode,
  {
    type = "sine",
    startHz,
    endHz,
    fmRatio,
    fmDepth = 0,
    gain,
    attack,
    decay,
    release,
    delay,
  }: {
    type?: OscillatorType;
    startHz: number;
    endHz?: number;
    fmRatio?: number;
    fmDepth?: number;
    gain?: number;
    attack?: number;
    decay?: number;
    release?: number;
    delay?: number;
  },
) {
  const { node, startAt, endAt } = makeEnv(ctx, destination, { gain, attack, decay, release, delay });
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(startHz, startAt);
  if (typeof endHz === "number" && endHz !== startHz) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endHz), endAt);
  }

  let fmOsc: OscillatorNode | null = null;
  let fmGain: GainNode | null = null;
  if (fmRatio && fmDepth > 0) {
    fmOsc = ctx.createOscillator();
    fmGain = ctx.createGain();
    fmOsc.type = "sine";
    fmOsc.frequency.setValueAtTime(startHz * fmRatio, startAt);
    fmGain.gain.setValueAtTime(fmDepth, startAt);
    fmOsc.connect(fmGain);
    fmGain.connect(osc.frequency);
  }

  osc.connect(node);
  osc.start(startAt);
  osc.stop(endAt);
  fmOsc?.start(startAt);
  fmOsc?.stop(endAt);
}

function playError(ctx: AudioContext, destination: AudioNode) {
  const low = ctx.createBiquadFilter();
  low.type = "lowpass";
  low.frequency.value = 1200;
  low.connect(destination);

  playTone(ctx, low, { type: "sawtooth", startHz: 320, endHz: 140, gain: 0.17, decay: 0.18, release: 0.05 });
  playTone(ctx, low, { type: "square", startHz: 180, endHz: 90, gain: 0.12, decay: 0.15, release: 0.04, delay: 0.03 });
}

function playSuccess(ctx: AudioContext, destination: AudioNode) {
  playTone(ctx, destination, { type: "sine", startHz: 523, gain: 0.12, attack: 0.003, decay: 0.16, release: 0.06 });
  playTone(ctx, destination, { type: "sine", startHz: 659, gain: 0.1, attack: 0.003, decay: 0.16, release: 0.06, delay: 0.07 });
  playTone(ctx, destination, { type: "sine", startHz: 784, endHz: 880, gain: 0.1, attack: 0.003, decay: 0.18, release: 0.07, delay: 0.14 });
}

function readInitialEnabled() {
  if (typeof window === "undefined") return true;
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "0") return false;
    if (v === "1") return true;
  } catch {
    // ignore
  }
  return true;
}

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabledState] = useState<boolean>(() => readInitialEnabled());
  const ctxRef = useRef<AudioContext | null>(null);

  const setEnabled = useCallback((value: boolean) => {
    setEnabledState(value);
    try {
      localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
    } catch {
      // ignore
    }
  }, []);

  const toggleEnabled = useCallback(() => {
    setEnabled(!enabled);
  }, [enabled, setEnabled]);

  const play = useCallback(
    async (kind: SoundKind, opts?: { force?: boolean }) => {
      if ((!enabled && !opts?.force) || isReducedMotion()) return;
      const ctx = createContextSafe(ctxRef);
      if (!ctx) return;
      if (ctx.state === "suspended") {
        await ctx.resume();
      }
      const destination = ctx.destination;

      switch (kind) {
        case "tap":
          playTone(ctx, destination, {
            type: "sine",
            startHz: 1300,
            fmRatio: 0.5,
            fmDepth: 100,
            gain: 0.14,
            attack: 0,
            decay: 0.015,
            release: 0.005,
          });
          break;
        case "toggleOn":
          playTone(ctx, destination, { startHz: 2093, gain: 0.11, decay: 0.012, release: 0.004 });
          playTone(ctx, destination, { startHz: 3136, gain: 0.1, decay: 0.012, release: 0.004, delay: 0.025 });
          break;
        case "toggleOff":
          playTone(ctx, destination, { startHz: 3136, gain: 0.11, decay: 0.012, release: 0.004 });
          playTone(ctx, destination, { startHz: 2093, gain: 0.1, decay: 0.012, release: 0.004, delay: 0.025 });
          break;
        case "modalOpen":
          playTone(ctx, destination, { startHz: 430, endHz: 1400, gain: 0.09, decay: 0.08, release: 0.025 });
          break;
        case "modalClose":
          playTone(ctx, destination, { startHz: 730, endHz: 430, gain: 0.08, decay: 0.08, release: 0.025 });
          break;
        case "success":
          playSuccess(ctx, destination);
          break;
        case "error":
          playError(ctx, destination);
          break;
      }
    },
    [enabled],
  );

  const value = useMemo(
    () => ({ enabled, toggleEnabled, setEnabled, play }),
    [enabled, toggleEnabled, setEnabled, play],
  );

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
}

export function useSound() {
  const ctx = useContext(SoundContext);
  if (!ctx) throw new Error("useSound must be used inside SoundProvider");
  return ctx;
}
