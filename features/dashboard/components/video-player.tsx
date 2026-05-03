"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Play, Pause } from "lucide-react";
import {
  PANEL_SHADOW,
  OUTER_RADIUS,
  GAP,
  INNER_RADIUS,
  SCREW_SIZE,
  SCREW_INSET,
  Screw,
} from "./panel-primitives";

export default function VideoPlayer() {
  const screwInset = SCREW_INSET;

  const videoRef = useRef<HTMLVideoElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [videoSrc] = useState<string | null>(null);

  const togglePlay = useCallback(() => {
    if (!videoRef.current || !videoSrc) return;
    if (isPlaying) {
      videoRef.current.pause();
      setShowControls(true);
    } else {
      videoRef.current.play();
    }
    setIsPlaying((prev) => !prev);
  }, [isPlaying, videoSrc]);

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setProgress(
      (videoRef.current.currentTime / videoRef.current.duration) * 100
    );
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = pct * videoRef.current.duration;
    setProgress(pct * 100);
  };

  const scheduleHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 2500);
  }, []);

  const handleMouseMove = () => {
    setShowControls(true);
    if (isPlaying) scheduleHide();
  };

  useEffect(() => {
    if (isPlaying) {
      scheduleHide();
    } else {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    }
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [isPlaying, scheduleHide]);

  return (
    <div
      className="flex h-full w-full min-h-0 min-w-0 items-start justify-end pl-2 pr-0.5 pt-1.5
        pb-3 sm:pl-3 sm:pr-1.5 sm:pt-2 sm:pb-4"
    >
      <motion.div
        className="relative flex h-[100%] w-[min(100%,90%)] min-h-0 min-w-0 max-h-full shrink-0 flex-col
          border border-black/[0.04] bg-[color:var(--panel-texture-bg)] bg-[image:var(--panel-texture-image)] bg-[length:200px_200px]"
        style={{
          borderRadius: `${OUTER_RADIUS}px`,
          padding: `${GAP}px`,
          boxShadow: PANEL_SHADOW,
        }}
        whileHover={{ y: -1, rotate: 0.08, scale: 1.003 }}
        drag
        dragConstraints={{ top: -4, left: -4, right: 4, bottom: 4 }}
        dragElastic={0.08}
        dragTransition={{ bounceStiffness: 820, bounceDamping: 40 }}
        transition={{ type: "spring", stiffness: 300, damping: 28, mass: 0.65 }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => isPlaying && setShowControls(false)}
      >
        <Screw
          className="absolute"
          style={{
            top: screwInset,
            left: screwInset,
            width: SCREW_SIZE,
            height: SCREW_SIZE,
          }}
        />
        <Screw
          className="absolute"
          style={{
            top: screwInset,
            right: screwInset,
            width: SCREW_SIZE,
            height: SCREW_SIZE,
          }}
        />

        <div
          className="relative flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden bg-neutral-900"
          style={{ borderRadius: `${INNER_RADIUS}px` }}
        >
          {videoSrc ? (
            <video
              ref={videoRef}
              src={videoSrc}
              className="w-full h-full object-contain"
              onTimeUpdate={handleTimeUpdate}
              onEnded={() => {
                setIsPlaying(false);
                setShowControls(true);
              }}
            />
          ) : (
            <p className="text-neutral-600 text-xs tracking-wide select-none">
              drop or upload a video
            </p>
          )}

          <AnimatePresence>
            {showControls && (
              <motion.div
                initial={{ y: 6, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{
                  y: 6,
                  opacity: 0,
                  transition: { duration: 0.2, ease: [0.42, 0, 1, 1] },
                }}
                transition={{ duration: 0.25, ease: [0, 0, 0.58, 1] }}
                className="absolute bottom-0 left-0 right-0 flex items-center gap-2.5
                  px-3 py-2.5 bg-gradient-to-t from-black/40 via-black/10 to-transparent"
              >
                <button
                  onClick={togglePlay}
                  className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full
                    cursor-pointer hover:bg-white/10 active:scale-95
                    transition-all duration-150"
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {isPlaying ? (
                      <motion.div
                        key="pause"
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.85 }}
                        transition={{ duration: 0.12, ease: "easeOut" }}
                      >
                        <Pause size={13} className="text-white" />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="play"
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.85 }}
                        transition={{ duration: 0.12, ease: "easeOut" }}
                      >
                        <Play size={13} className="text-white" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>

                <div
                  className="flex-1 py-1.5 -my-1.5 cursor-pointer group"
                  onClick={handleSeek}
                >
                  <div className="h-[3px] bg-white/20 rounded-full relative">
                    <div
                      className="h-full bg-white/70 rounded-full relative"
                      style={{ width: `${progress}%` }}
                    >
                      <div
                        className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5
                          rounded-full bg-white shadow-[0_1px_3px_rgba(17,24,39,0.18)]
                          scale-0 group-hover:scale-100 transition-transform duration-150"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

// — HTML video element wrapper with controls styling.
