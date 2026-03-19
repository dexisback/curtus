"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Play, Pause } from "lucide-react";

const PANEL_SHADOW = [
  "0 1px 2px rgba(17,24,39,0.06)",
  "0 4px 10px rgba(17,24,39,0.05)",
  "3px 10px 24px rgba(17,24,39,0.07)",
  "8px 20px 56px rgba(17,24,39,0.13)",
].join(",");

export default function VideoPlayer() {
  // Slightly tighter frame than the last iteration (less \"fat\" gap).
  const OUTER_RADIUS = 28;
  const GAP = 22;
  const INNER_RADIUS = OUTER_RADIUS - GAP;
  const SCREW_SIZE = 18;
  // Center screws visually within the *curved* corner band (not the square gap).
  // We place the screw center on the 45° point of the band mid-arc.
  const midArcRadius = OUTER_RADIUS - GAP / 2;
  const corner45Inset = OUTER_RADIUS - midArcRadius / Math.SQRT2;
  const screwInset = corner45Inset - SCREW_SIZE / 2;

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
      setShowControls(true);
    }
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [isPlaying, scheduleHide]);

  return (
    <div className="w-full h-full flex items-start justify-center pt-6 px-10 pl-20">
      <motion.div
        className="relative w-[75%] max-w-[700px] aspect-video panel-texture border border-black/[0.06]"
        style={{
          borderRadius: `${OUTER_RADIUS}px`,
          padding: `${GAP}px`,
          boxShadow: PANEL_SHADOW,
        }}
        whileHover={{ y: -2, rotate: 0.12, scale: 1.006 }}
        transition={{ type: "spring", stiffness: 260, damping: 26, mass: 0.75 }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => isPlaying && setShowControls(false)}
      >
        {/* Screws centered within the gap band */}
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
          className="relative w-full h-full overflow-hidden bg-neutral-900 flex items-center justify-center"
          style={{ borderRadius: `${INNER_RADIUS}px` }}
        >
          {videoSrc ? (
            <video
              ref={videoRef}
              src={videoSrc}
              className="w-full h-full object-contain"
              onTimeUpdate={handleTimeUpdate}
              onEnded={() => setIsPlaying(false)}
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

function Screw({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  const slotStyle = (rotate: number): React.CSSProperties => ({
    position: "absolute",
    width: "48%",
    height: "1.5px",
    borderRadius: "1px",
    top: "50%",
    left: "50%",
    transform: `translate(-50%, -50%) rotate(${rotate}deg)`,
    background:
      "linear-gradient(90deg, transparent 0%, rgba(60,55,48,0.3) 20%, rgba(60,55,48,0.5) 50%, rgba(60,55,48,0.3) 80%, transparent 100%)",
  });

  return (
    <div className={`z-10 ${className ?? ""}`} style={style}>
      {/* Screw head */}
      <div
        className="w-full h-full rounded-full relative"
        style={{
          background:
            "radial-gradient(circle at 36% 30%, #e0dbd4 0%, #c4beb6 35%, #a8a29a 65%, #938d86 100%)",
          boxShadow: [
            "0 1.5px 5px rgba(17,24,39,0.16)",
            "0 0 0 0.5px rgba(0,0,0,0.1)",
            "inset 0 2px 1.5px rgba(255,255,255,0.3)",
            "inset 0 -1.5px 1.5px rgba(0,0,0,0.08)",
          ].join(","),
        }}
      >
        {/* Torx 6-point star recess: 3 rotated slots */}
        <div className="absolute inset-0">
          <div style={slotStyle(0)} />
          <div style={slotStyle(60)} />
          <div style={slotStyle(120)} />
        </div>

        {/* Center dot — the hex recess depth */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
            w-[3px] h-[3px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(50,45,40,0.45) 0%, rgba(50,45,40,0.15) 100%)",
          }}
        />
      </div>
    </div>
  );
}
