"use client";

import { motion } from "motion/react";
import { Maximize2, Plus, X } from "lucide-react";
import {
  PANEL_SHADOW,
  OUTER_RADIUS,
  GAP,
  INNER_RADIUS,
  SCREW_SIZE,
  SCREW_INSET,
  Screw,
} from "./panel-primitives";
import { SPRING_HOVER } from "@/lib/ui-motion";

const EMPTY_TOOLTIP = "start watching a youtube video";

type Props = {
  embedUrl: string | null;
  /** Library: fixed 16:9; dashboard: fills parent height. */
  large?: boolean;
  /** Shown when `large` and no URL (one line, no icon). */
  emptyHint?: string | null;
  onWatchLecture?: () => void;
  onClearLecture?: () => void;
  activeLabel?: string | null;
  /** Dashboard only: expands into fullscreen shell (iframe does not remount). */
  onEnterFocus?: () => void;
  focusMode?: boolean;
};

export default function YouTubeEmbedPanel({
  embedUrl,
  large = false,
  emptyHint = null,
  onWatchLecture,
  onClearLecture,
  activeLabel,
  onEnterFocus,
  focusMode = false,
}: Props) {
  const screwInset = SCREW_INSET;
  const isLibraryLayout = large;
  const showDashboardLectureEmpty = !isLibraryLayout && !!onWatchLecture;

  return (
    <div
      className={
        isLibraryLayout
          ? "flex w-full min-w-0 flex-col items-stretch"
          : "flex h-full w-full min-h-0 min-w-0 items-stretch justify-end pl-2 pr-0.5 pt-1.5 pb-3 sm:pl-3 sm:pr-1.5 sm:pt-2 sm:pb-4"
      }
    >
      <motion.div
        className={
          "relative flex w-full flex-col border border-black/[0.04] bg-[color:var(--panel-texture-bg)] bg-[image:var(--panel-texture-image)] bg-[length:200px_200px] " +
          (isLibraryLayout ? "min-w-0 shrink-0" : "h-full min-h-0 min-w-0 max-h-full w-[min(100%,90%)] shrink-0")
        }
        style={{
          borderRadius: `${OUTER_RADIUS}px`,
          padding: `${GAP}px`,
          boxShadow: PANEL_SHADOW,
        }}
        whileHover={isLibraryLayout ? undefined : { y: -1, rotate: 0.06, scale: 1.002 }}
        transition={SPRING_HOVER}
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
            isLibraryLayout
              ? "relative aspect-video w-full overflow-hidden bg-neutral-950"
              : "relative flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden bg-neutral-950"
          }
          style={{ borderRadius: `${INNER_RADIUS}px` }}
        >
          {embedUrl && onClearLecture && !focusMode && (
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
          {embedUrl && onEnterFocus && !focusMode && (
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={onEnterFocus}
              className="absolute left-2 top-2 z-20 flex h-10 w-10 items-center justify-center rounded-lg border border-white/18 bg-black/45 text-white/85 backdrop-blur-sm transition-colors hover:bg-black/60 hover:text-white"
              aria-label="Focus mode — full screen lecture"
              title="Focus mode — full screen lecture"
            >
              <Maximize2 size={15} strokeWidth={1.9} />
            </motion.button>
          )}
          {embedUrl ? (
            <iframe
              src={embedUrl}
              title="YouTube player"
              className={isLibraryLayout ? "absolute inset-0 h-full w-full" : "h-full w-full"}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          ) : showDashboardLectureEmpty ? (
            <div className="flex h-full w-full flex-1 items-center justify-center">
              <button
                type="button"
                onClick={onWatchLecture}
                title={EMPTY_TOOLTIP}
                aria-label={EMPTY_TOOLTIP}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/22 text-white/88 transition-colors hover:border-white/45 hover:bg-white/10 hover:text-white"
              >
                <Plus className="h-5 w-5" strokeWidth={1.75} aria-hidden />
              </button>
            </div>
          ) : emptyHint ? (
            <p className="max-w-[20rem] px-4 text-center text-xs leading-snug text-white/55 text-balance antialiased">
              {emptyHint}
            </p>
          ) : null}
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
