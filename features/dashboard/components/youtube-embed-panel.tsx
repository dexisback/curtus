"use client";

import { motion } from "motion/react";
import { PlayCircle } from "lucide-react";
import {
  PANEL_SHADOW,
  OUTER_RADIUS,
  GAP,
  INNER_RADIUS,
  SCREW_SIZE,
  SCREW_INSET,
  Screw,
} from "./panel-primitives";

type Props = {
  embedUrl: string | null;
  placeholder?: string;
  large?: boolean;
};

export default function YouTubeEmbedPanel({
  embedUrl,
  placeholder = "Add a YouTube URL in Library to start watching.",
  large = false,
}: Props) {
  const screwInset = SCREW_INSET;

  return (
    <div
      className={
        "flex h-full w-full min-h-0 min-w-0 items-start justify-end " +
        (large ? "p-1 sm:p-2" : "pl-2 pr-0.5 pt-1.5 pb-3 sm:pl-3 sm:pr-1.5 sm:pt-2 sm:pb-4")
      }
    >
      <motion.div
        className={
          "relative flex min-h-0 min-w-0 max-h-full shrink-0 flex-col border border-black/[0.04] bg-[color:var(--panel-texture-bg)] bg-[image:var(--panel-texture-image)] bg-[length:200px_200px] " +
          (large ? "h-full w-full" : "h-[100%] w-[min(100%,90%)]")
        }
        style={{
          borderRadius: `${OUTER_RADIUS}px`,
          padding: `${GAP}px`,
          boxShadow: PANEL_SHADOW,
        }}
        whileHover={{ y: -1, rotate: 0.08, scale: 1.003 }}
        transition={{ type: "spring", stiffness: 300, damping: 28, mass: 0.65 }}
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
          className="relative flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden bg-neutral-950"
          style={{ borderRadius: `${INNER_RADIUS}px` }}
        >
          {embedUrl ? (
            <iframe
              src={embedUrl}
              title="YouTube player"
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          ) : (
            <div className="flex flex-col items-center gap-2 px-6 text-center">
              <PlayCircle size={28} className="text-white/60" />
              <p className="text-[11px] text-white/65">{placeholder}</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// — Styled dashboard panel for embedding YouTube video/playlist playback.
