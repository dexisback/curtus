"use client";

import { motion } from "motion/react";
import { PlayCircle, X } from "lucide-react";
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
  ctaLabel?: string;
  onWatchLecture?: () => void;
  onClearLecture?: () => void;
  activeLabel?: string | null;
};

export default function YouTubeEmbedPanel({
  embedUrl,
  placeholder = "Add a YouTube URL in Library to start watching.",
  large = false,
  ctaLabel = "Watch a lecture",
  onWatchLecture,
  onClearLecture,
  activeLabel,
}: Props) {
  const screwInset = SCREW_INSET;
  /** Library uses scroll layout — fixed 16:9 instead of filling an unknown flex height. */
  const libraryLayout = large;

  return (
    <div
      className={
        libraryLayout
          ? "flex w-full min-w-0 flex-col items-stretch p-1 sm:p-2"
          : "flex h-full w-full min-h-0 min-w-0 items-start justify-end pl-2 pr-0.5 pt-1.5 pb-3 sm:pl-3 sm:pr-1.5 sm:pt-2 sm:pb-4"
      }
    >
      <motion.div
        className={
          "relative flex w-full flex-col border border-black/[0.04] bg-[color:var(--panel-texture-bg)] bg-[image:var(--panel-texture-image)] bg-[length:200px_200px] " +
          (libraryLayout ? "min-w-0 shrink-0" : "min-h-0 min-w-0 max-h-full shrink-0 h-[100%] w-[min(100%,90%)]")
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
          className={
            libraryLayout
              ? "relative aspect-video w-full overflow-hidden bg-neutral-950"
              : "relative flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden bg-neutral-950"
          }
          style={{ borderRadius: `${INNER_RADIUS}px` }}
        >
          {embedUrl && onClearLecture && (
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={onClearLecture}
              className="absolute right-2 top-2 z-20 flex h-10 w-10 items-center justify-center rounded-lg border border-white/18 bg-black/45 text-white/85 backdrop-blur-sm transition-colors hover:bg-black/60 hover:text-white"
              aria-label="Clear lecture"
            >
              <X size={15} strokeWidth={1.9} />
            </motion.button>
          )}
          {embedUrl ? (
            <iframe
              src={embedUrl}
              title="YouTube player"
              className={libraryLayout ? "absolute inset-0 h-full w-full" : "h-full w-full"}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          ) : (
            <div className="flex flex-col items-center gap-3 px-6 text-center">
              <PlayCircle size={28} className="text-white/60" />
              <p className="text-[11px] text-white/65">{placeholder}</p>
              {onWatchLecture && (
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  onClick={onWatchLecture}
                  className="inline-flex h-10 min-w-40 items-center justify-center rounded-lg bg-cta px-3.5 text-[11px] font-medium text-cta-foreground shadow-[0_1px_2px_rgba(0,0,0,0.25)]"
                >
                  {ctaLabel}
                </motion.button>
              )}
            </div>
          )}
          {embedUrl && activeLabel && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/35 to-transparent px-3 pb-2.5 pt-8 text-center">
              <p className="truncate text-[10.5px] text-white/85">{activeLabel}</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// — Styled dashboard panel for embedding YouTube video/playlist playback.
