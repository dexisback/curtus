"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";

export type WhiteNoiseToneId = "paris-cafe" | "beach" | "rainforest";

type WhiteNoiseContextValue = {
  currentTone: WhiteNoiseToneId;
  isPlaying: boolean;
  volume: number;
  setTone: (tone: WhiteNoiseToneId) => Promise<void>;
  toggle: () => Promise<void>;
  stop: () => void;
  setVolume: (value: number) => void;
};

const WhiteNoiseContext = createContext<WhiteNoiseContextValue | null>(null);
const TONE_KEY = "swm:white-noise-tone";
const PLAYING_KEY = "swm:white-noise-playing";
const VOLUME_KEY = "swm:white-noise-volume";

type Engine = {
  stop: () => void;
  gain: GainNode;
};

function createContextSafe(ctxRef: MutableRefObject<AudioContext | null>) {
  if (typeof window === "undefined") return null;
  const Ctx = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!ctxRef.current) ctxRef.current = new Ctx();
  return ctxRef.current;
}

function readTone() {
  if (typeof window === "undefined") return "rainforest" as WhiteNoiseToneId;
  const v = localStorage.getItem(TONE_KEY);
  if (v === "paris-cafe" || v === "beach" || v === "rainforest") return v;
  return "rainforest";
}

function readPlaying() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(PLAYING_KEY) === "1";
}

function readVolume() {
  if (typeof window === "undefined") return 0.45;
  const n = Number(localStorage.getItem(VOLUME_KEY));
  if (!Number.isFinite(n)) return 0.45;
  return Math.min(1, Math.max(0.05, n));
}

function createNoiseBuffer(ctx: AudioContext) {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const out = buffer.getChannelData(0);
  for (let i = 0; i < out.length; i++) out[i] = Math.random() * 2 - 1;
  return buffer;
}

function startNoiseLoop(
  ctx: AudioContext,
  noiseBuffer: AudioBuffer,
  destination: AudioNode,
  gainValue: number,
  filterType: BiquadFilterType,
  filterFreq: number,
  filterQ = 1,
) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  src.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.value = filterFreq;
  filter.Q.value = filterQ;
  const gain = ctx.createGain();
  gain.gain.value = gainValue;
  src.connect(filter);
  filter.connect(gain);
  gain.connect(destination);
  src.start();
  return {
    stop: () => {
      try {
        src.stop();
      } catch {}
      src.disconnect();
      filter.disconnect();
      gain.disconnect();
    },
  };
}

function buildToneEngine(
  ctx: AudioContext,
  noiseBuffer: AudioBuffer,
  tone: WhiteNoiseToneId,
  destination: AudioNode,
): Engine {
  const toneGain = ctx.createGain();
  toneGain.gain.value = 0.42;
  toneGain.connect(destination);
  const stops: Array<() => void> = [];

  if (tone === "rainforest") {
    const base = startNoiseLoop(ctx, noiseBuffer, toneGain, 0.34, "bandpass", 850, 0.5);
    const hiss = startNoiseLoop(ctx, noiseBuffer, toneGain, 0.12, "highpass", 4200, 0.7);
    stops.push(base.stop, hiss.stop);
  }

  if (tone === "beach") {
    const surf = startNoiseLoop(ctx, noiseBuffer, toneGain, 0.26, "lowpass", 1200, 0.8);
    const foam = startNoiseLoop(ctx, noiseBuffer, toneGain, 0.1, "bandpass", 2200, 0.5);
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 80;
    oscGain.gain.value = 0.012;
    osc.connect(oscGain);
    oscGain.connect(toneGain);
    osc.start();
    stops.push(
      surf.stop,
      foam.stop,
      () => {
        try {
          osc.stop();
        } catch {}
        osc.disconnect();
        oscGain.disconnect();
      },
    );
  }

  if (tone === "paris-cafe") {
    const room = startNoiseLoop(ctx, noiseBuffer, toneGain, 0.22, "bandpass", 1400, 0.7);
    const chatter = startNoiseLoop(ctx, noiseBuffer, toneGain, 0.08, "highpass", 2600, 0.7);
    const hum = ctx.createOscillator();
    const humGain = ctx.createGain();
    hum.type = "triangle";
    hum.frequency.value = 115;
    humGain.gain.value = 0.015;
    hum.connect(humGain);
    humGain.connect(toneGain);
    hum.start();
    stops.push(
      room.stop,
      chatter.stop,
      () => {
        try {
          hum.stop();
        } catch {}
        hum.disconnect();
        humGain.disconnect();
      },
    );
  }

  return {
    gain: toneGain,
    stop: () => {
      for (const stop of stops) stop();
      toneGain.disconnect();
    },
  };
}

export function WhiteNoiseProvider({ children }: { children: React.ReactNode }) {
  const [currentTone, setCurrentTone] = useState<WhiteNoiseToneId>(() => readTone());
  const [isPlaying, setIsPlaying] = useState<boolean>(() => readPlaying());
  const [volume, setVolumeState] = useState<number>(() => readVolume());

  const ctxRef = useRef<AudioContext | null>(null);
  const noiseBufferRef = useRef<AudioBuffer | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const engineRef = useRef<Engine | null>(null);

  const stop = useCallback(() => {
    engineRef.current?.stop();
    engineRef.current = null;
    setIsPlaying(false);
    if (typeof window !== "undefined") localStorage.setItem(PLAYING_KEY, "0");
  }, []);

  const start = useCallback(
    async (tone: WhiteNoiseToneId) => {
      const ctx = createContextSafe(ctxRef);
      if (!ctx) return;
      if (ctx.state === "suspended") await ctx.resume();

      if (!noiseBufferRef.current) noiseBufferRef.current = createNoiseBuffer(ctx);
      if (!masterRef.current) {
        masterRef.current = ctx.createGain();
        masterRef.current.gain.value = volume;
        masterRef.current.connect(ctx.destination);
      }

      engineRef.current?.stop();
      engineRef.current = buildToneEngine(ctx, noiseBufferRef.current, tone, masterRef.current);
      setCurrentTone(tone);
      setIsPlaying(true);
      localStorage.setItem(TONE_KEY, tone);
      localStorage.setItem(PLAYING_KEY, "1");
    },
    [volume],
  );

  const setTone = useCallback(
    async (tone: WhiteNoiseToneId) => {
      if (isPlaying) await start(tone);
      else {
        setCurrentTone(tone);
        localStorage.setItem(TONE_KEY, tone);
      }
    },
    [isPlaying, start],
  );

  const toggle = useCallback(async () => {
    if (isPlaying) stop();
    else await start(currentTone);
  }, [currentTone, isPlaying, start, stop]);

  const setVolume = useCallback((value: number) => {
    const next = Math.min(1, Math.max(0.05, value));
    setVolumeState(next);
    if (masterRef.current) masterRef.current.gain.value = next;
    if (typeof window !== "undefined") localStorage.setItem(VOLUME_KEY, String(next));
  }, []);

  useEffect(() => {
    if (masterRef.current) masterRef.current.gain.value = volume;
  }, [volume]);

  useEffect(() => {
    const ctx = ctxRef.current;
    return () => {
      engineRef.current?.stop();
      masterRef.current?.disconnect();
      if (ctx && ctx.state !== "closed") {
        void ctx.close();
      }
    };
  }, []);

  const value = useMemo(
    () => ({ currentTone, isPlaying, volume, setTone, toggle, stop, setVolume }),
    [currentTone, isPlaying, volume, setTone, toggle, stop, setVolume],
  );

  return <WhiteNoiseContext.Provider value={value}>{children}</WhiteNoiseContext.Provider>;
}

export function useWhiteNoise() {
  const ctx = useContext(WhiteNoiseContext);
  if (!ctx) throw new Error("useWhiteNoise must be used inside WhiteNoiseProvider");
  return ctx;
}

// — WebAudio white-noise ambience with localStorage-backed tone + play state.
