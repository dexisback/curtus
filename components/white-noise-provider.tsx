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
import { TONE_SOUND_FILE, ambientUrl, type WhiteNoiseToneId } from "@/lib/ambient-sounds";

type WhiteNoiseContextValue = {
  currentTone: WhiteNoiseToneId;
  isPlaying: boolean;
  previewSoundId: string | null;
  volume: number;
  ready: boolean;
  error: string | null;
  initAudio: () => Promise<boolean>;
  setTone: (tone: WhiteNoiseToneId) => Promise<void>;
  toggle: () => Promise<void>;
  stop: () => void;
  setVolume: (value: number) => void;
  playDeveloperPreview: (soundId: string, fileName: string) => Promise<void>;
  playTone: (tone: WhiteNoiseToneId) => Promise<boolean>;
};

const WhiteNoiseContext = createContext<WhiteNoiseContextValue | null>(null);
const TONE_KEY = "swm:white-noise-tone";
const PLAYING_KEY = "swm:white-noise-playing";
const VOLUME_KEY = "swm:white-noise-volume";

function persistPlayingFlag(playing: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PLAYING_KEY, playing ? "1" : "0");
}

function createContextSafe(ctxRef: MutableRefObject<AudioContext | null>) {
  if (typeof window === "undefined") return null;
  const Ctx = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!ctxRef.current) ctxRef.current = new Ctx();
  return ctxRef.current;
}

function readTone() {
  if (typeof window === "undefined") return "river" as WhiteNoiseToneId;
  const v = localStorage.getItem(TONE_KEY);
  if (v === "paris-cafe" || v === "beach" || v === "river") return v;
  return "river";
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

function pauseAllTonePlayers(players: Partial<Record<WhiteNoiseToneId, HTMLAudioElement>>) {
  for (const key of Object.keys(players) as WhiteNoiseToneId[]) {
    const a = players[key];
    if (!a) continue;
    a.pause();
    a.currentTime = 0;
  }
}

function createNoiseBuffer(ctx: AudioContext, seconds = 2): AudioBuffer {
  const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

function synthConfigForTone(tone: WhiteNoiseToneId): { filterHz: number; q: number; gain: number } {
  if (tone === "beach") return { filterHz: 2800, q: 0.7, gain: 0.085 };
  if (tone === "paris-cafe") return { filterHz: 1200, q: 1.1, gain: 0.06 };
  return { filterHz: 700, q: 0.9, gain: 0.08 }; // river
}

export function WhiteNoiseProvider({ children }: { children: React.ReactNode }) {
  const [currentTone, setCurrentTone] = useState<WhiteNoiseToneId>(() => readTone());
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState<number>(() => readVolume());
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shouldResumeRef = useRef<boolean>(false);

  const ctxRef = useRef<AudioContext | null>(null);
  const playersRef = useRef<Partial<Record<WhiteNoiseToneId, HTMLAudioElement>>>({});
  const synthGainRef = useRef<GainNode | null>(null);
  const synthStopRef = useRef<(() => void) | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const previewIdRef = useRef<string | null>(null);
  const [previewSoundId, setPreviewSoundId] = useState<string | null>(null);

  const stopPreviewInternal = useCallback((clearId = true) => {
    const el = previewAudioRef.current;
    if (el) {
      el.pause();
      el.currentTime = 0;
      el.src = "";
      previewAudioRef.current = null;
    }
    if (clearId) {
      previewIdRef.current = null;
      setPreviewSoundId(null);
    }
  }, []);

  const getPlayer = useCallback((tone: WhiteNoiseToneId) => {
    const cached = playersRef.current[tone];
    if (cached) return cached;
    const audio = new Audio(ambientUrl(TONE_SOUND_FILE[tone]));
    audio.loop = true;
    audio.preload = "auto";
    audio.volume = volume;
    playersRef.current[tone] = audio;
    return audio;
  }, [volume]);

  const stop = useCallback(() => {
    stopPreviewInternal(true);
    pauseAllTonePlayers(playersRef.current);
    synthStopRef.current?.();
    synthStopRef.current = null;
    synthGainRef.current = null;
    setIsPlaying(false);
    persistPlayingFlag(false);
  }, [stopPreviewInternal]);

  const initAudio = useCallback(async () => {
    const ctx = createContextSafe(ctxRef);
    if (!ctx) {
      setError("Audio is not supported in this browser.");
      return false;
    }
    try {
      if (ctx.state === "suspended") await ctx.resume();
      setReady(ctx.state === "running");
      if (ctx.state !== "running") {
        setError("Tap again to allow audio playback.");
        return false;
      }
      setError(null);
      return true;
    } catch {
      setError("Could not start audio.");
      return false;
    }
  }, []);

  const start = useCallback(
    async (tone: WhiteNoiseToneId) => {
      const canPlay = await initAudio();
      if (!canPlay) return false;
      stopPreviewInternal(true);
      pauseAllTonePlayers(playersRef.current);
      synthStopRef.current?.();
      synthStopRef.current = null;
      synthGainRef.current = null;
      const player = getPlayer(tone);
      player.volume = volume;
      try {
        await player.play();
      } catch {
        const ctx = createContextSafe(ctxRef);
        if (!ctx) {
          setError("Could not play selected ambience.");
          return false;
        }
        const source = ctx.createBufferSource();
        source.buffer = createNoiseBuffer(ctx);
        source.loop = true;
        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        const cfg = synthConfigForTone(tone);
        filter.frequency.value = cfg.filterHz;
        filter.Q.value = cfg.q;
        const gain = ctx.createGain();
        gain.gain.value = Math.max(0.01, Math.min(0.2, cfg.gain * (volume / 0.45)));
        source.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        source.start();
        synthGainRef.current = gain;
        synthStopRef.current = () => {
          try {
            source.stop();
          } catch {
            /* ignore stop races */
          }
          source.disconnect();
          filter.disconnect();
          gain.disconnect();
        };
      }
      setCurrentTone(tone);
      setIsPlaying(true);
      localStorage.setItem(TONE_KEY, tone);
      persistPlayingFlag(true);
      setError(null);
      return true;
    },
    [getPlayer, initAudio, stopPreviewInternal, volume],
  );

  const playDeveloperPreview = useCallback(
    async (soundId: string, fileName: string) => {
      const current = previewAudioRef.current;
      if (previewIdRef.current === soundId && current && !current.paused) {
        stopPreviewInternal(true);
        setIsPlaying(false);
        persistPlayingFlag(false);
        return;
      }

      const canPlay = await initAudio();
      if (!canPlay) return;

      pauseAllTonePlayers(playersRef.current);
      stopPreviewInternal(false);

      const el = new Audio(ambientUrl(fileName));
      el.loop = false;
      el.preload = "auto";
      el.volume = volume;
      previewAudioRef.current = el;
      previewIdRef.current = soundId;
      setPreviewSoundId(soundId);

      const onEnded = () => {
        if (previewAudioRef.current !== el) return;
        stopPreviewInternal(true);
        setIsPlaying(false);
        persistPlayingFlag(false);
      };
      el.addEventListener("ended", onEnded, { once: true });

      try {
        await el.play();
      } catch {
        stopPreviewInternal(true);
        setIsPlaying(false);
        // Fallback preview when asset files are unavailable in deployment.
        const ctx = createContextSafe(ctxRef);
        if (ctx) {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = "triangle";
          o.frequency.value = 440;
          g.gain.value = 0.06;
          o.connect(g);
          g.connect(ctx.destination);
          o.start();
          o.stop(ctx.currentTime + 0.25);
          setError(null);
          return;
        }
        setError("Could not play this sample.");
        return;
      }

      if (previewAudioRef.current !== el) return;

      setIsPlaying(true);
      persistPlayingFlag(false);
      setError(null);
    },
    [initAudio, stopPreviewInternal, volume],
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
    else {
      const ok = await start(currentTone);
      if (!ok) setIsPlaying(false);
    }
  }, [currentTone, isPlaying, start, stop]);

  const setVolume = useCallback((value: number) => {
    const next = Math.min(1, Math.max(0.05, value));
    setVolumeState(next);
    for (const key of Object.keys(playersRef.current) as WhiteNoiseToneId[]) {
      const a = playersRef.current[key];
      if (a) a.volume = next;
    }
    const preview = previewAudioRef.current;
    if (preview) preview.volume = next;
    if (synthGainRef.current) {
      synthGainRef.current.gain.value = Math.max(0.01, Math.min(0.2, 0.08 * (next / 0.45)));
    }
    if (typeof window !== "undefined") localStorage.setItem(VOLUME_KEY, String(next));
  }, []);

  useEffect(() => {
    shouldResumeRef.current = readPlaying();
  }, []);

  useEffect(() => {
    const onFirstGesture = () => {
      if (!shouldResumeRef.current || isPlaying) return;
      shouldResumeRef.current = false;
      void start(currentTone);
    };
    window.addEventListener("pointerdown", onFirstGesture, { once: true });
    return () => window.removeEventListener("pointerdown", onFirstGesture);
  }, [currentTone, isPlaying, start]);

  useEffect(() => {
    const ctx = ctxRef.current;
    const players = playersRef.current;
    return () => {
      const pv = previewAudioRef.current;
      if (pv) {
        pv.pause();
        pv.src = "";
        previewAudioRef.current = null;
      }
      previewIdRef.current = null;
      for (const key of Object.keys(players) as WhiteNoiseToneId[]) {
        const a = players[key];
        if (!a) continue;
        a.pause();
        a.src = "";
      }
      synthStopRef.current?.();
      synthStopRef.current = null;
      synthGainRef.current = null;
      if (ctx && ctx.state !== "closed") {
        void ctx.close();
      }
    };
  }, []);

  const value = useMemo(
    () => ({
      currentTone,
      isPlaying,
      previewSoundId,
      volume,
      ready,
      error,
      initAudio,
      setTone,
      toggle,
      stop,
      setVolume,
      playDeveloperPreview,
      playTone: start,
    }),
    [
      currentTone,
      isPlaying,
      previewSoundId,
      volume,
      ready,
      error,
      initAudio,
      setTone,
      toggle,
      stop,
      setVolume,
      playDeveloperPreview,
      start,
    ],
  );

  return <WhiteNoiseContext.Provider value={value}>{children}</WhiteNoiseContext.Provider>;
}

export function useWhiteNoise() {
  const ctx = useContext(WhiteNoiseContext);
  if (!ctx) throw new Error("useWhiteNoise must be used inside WhiteNoiseProvider");
  return ctx;
}

// — WebAudio white-noise ambience with localStorage-backed tone + play state.
