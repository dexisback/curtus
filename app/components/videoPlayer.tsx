"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Play, Pause } from "lucide-react";

export default function VideoPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [videoSrc] = useState<string | null>(null);

  const togglePlay = useCallback(() => {
    if (!videoRef.current || !videoSrc) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying((prev) => !prev);
  }, [isPlaying, videoSrc]);

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const pct =
      (videoRef.current.currentTime / videoRef.current.duration) * 100;
    setProgress(pct);
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
      setShowControls(true);
    }
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [isPlaying, scheduleHide]);

  return (
    <div className="relative w-full h-full flex items-center justify-center p-8">
      <div
        className="relative w-full max-w-5xl aspect-video rounded-2xl shadow-[0_2px_24px_rgba(0,0,0,0.06)] panel-texture p-3"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => isPlaying && setShowControls(false)}
      >
        {/* Board pins */}
        <div className="absolute top-3 left-4 z-10 w-3 h-3 rounded-full bg-stone-300/80 shadow-[0_1px_3px_rgba(0,0,0,0.15)] border border-stone-400/20" />
        <div className="absolute top-3 right-4 z-10 w-3 h-3 rounded-full bg-stone-300/80 shadow-[0_1px_3px_rgba(0,0,0,0.15)] border border-stone-400/20" />

        {/* Inner video area */}
        <div className="relative w-full h-full rounded-xl overflow-hidden bg-neutral-900 flex items-center justify-center">
          {videoSrc ? (
            <video
              ref={videoRef}
              src={videoSrc}
              className="w-full h-full object-contain"
              onTimeUpdate={handleTimeUpdate}
              onEnded={() => setIsPlaying(false)}
            />
          ) : (
            <p className="text-neutral-600 text-xs tracking-wide">
              drop or upload a video
            </p>
          )}

          {/* Controls overlay */}
          <AnimatePresence>
            {showControls && (
              <motion.div
                initial={{ y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 8, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="absolute bottom-0 left-0 right-0 flex items-center gap-3 px-4 py-3 bg-gradient-to-t from-black/30 to-transparent"
              >
                <button
                  onClick={togglePlay}
                  className="shrink-0 cursor-pointer"
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {isPlaying ? (
                      <motion.div
                        key="pause"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                      >
                        <Pause size={14} className="text-white" />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="play"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                      >
                        <Play size={14} className="text-white" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>

                {/* Progress bar */}
                <div
                  ref={progressRef}
                  className="flex-1 h-[3px] bg-white/20 rounded-full cursor-pointer relative group"
                  onClick={handleSeek}
                >
                  <div
                    className="h-full bg-white/70 rounded-full relative transition-all duration-100"
                    style={{ width: `${progress}%` }}
                  >
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
