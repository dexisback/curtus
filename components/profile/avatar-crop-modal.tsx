"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import Cropper, { type Area, type Point } from "react-easy-crop";
import { X } from "lucide-react";
import { renderCroppedAvatarDataUrl } from "@/lib/avatar-crop";
import { DURATION, EASE_OUT_SMOOTH, SPRING_SNAP } from "@/lib/ui-motion";

type Props = {
  open: boolean;
  imageSrc: string | null;
  suggestedFileName?: string;
  onClose: () => void;
  /** Called after the user confirms crop; parent should revoke any blob URL used for imageSrc. */
  onApply: (dataUrl: string, fileName: string) => void;
};

export const MAX_AVATAR_SOURCE_BYTES = 15 * 1024 * 1024;

export default function AvatarCropModal({ open, imageSrc, suggestedFileName, onClose, onApply }: Props) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
      setBusy(false);
      setError(null);
    }
  }, [open]);

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  async function handleApply() {
    if (!imageSrc || !croppedAreaPixels || busy) return;
    setBusy(true);
    setError(null);
    try {
      const dataUrl = await renderCroppedAvatarDataUrl(imageSrc, croppedAreaPixels);
      const base = suggestedFileName?.replace(/\.[^.]+$/, "") || "avatar";
      onApply(dataUrl, `${base}.jpg`);
    } catch {
      setError("Could not process this image. Try another file.");
    } finally {
      setBusy(false);
    }
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && imageSrc && (
        <motion.div
          key="avatar-crop"
          className="fixed inset-0 z-[130] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: DURATION.fast, ease: EASE_OUT_SMOOTH }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !busy) onClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background/50 backdrop-blur-sm"
            aria-hidden
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="avatar-crop-title"
            initial={{ y: 10, opacity: 0, scale: 0.985 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 6, opacity: 0, scale: 0.985 }}
            transition={SPRING_SNAP}
            className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-border/50 bg-card/95 shadow-[0_12px_48px_rgba(17,24,39,0.12),inset_0_1px_0_rgba(255,255,255,0.45)]
              dark:bg-card/90 dark:shadow-[0_12px_48px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.06)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-border/50 px-4 py-3 sm:px-5">
              <h2 id="avatar-crop-title" className="text-[14px] font-semibold tracking-tight text-foreground">
                Crop profile photo
              </h2>
              <button
                type="button"
                onClick={() => {
                  if (!busy) onClose();
                }}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-background/80 text-muted-foreground transition-colors hover:bg-accent/70 hover:text-foreground"
                aria-label="Close"
              >
                <X size={16} strokeWidth={1.7} />
              </button>
            </div>

            <div className="px-4 py-3 sm:px-5">
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Drag to reposition. Use the slider to zoom. The preview is a square crop.
              </p>
              <div className="app-cursor-precision relative mt-3 h-[min(52vh,22rem)] w-full overflow-hidden rounded-xl bg-neutral-950">
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="rect"
                  showGrid={false}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                />
              </div>
              <div className="mt-4">
                <div className="mb-1 flex items-center justify-between text-[10.5px] text-muted-foreground">
                  <span>Zoom</span>
                  <span className="tabular-nums">{zoom.toFixed(2)}×</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.01}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="h-2 w-full accent-[var(--color-cta)]"
                  aria-label="Zoom"
                />
              </div>
              {error && <p className="mt-2 text-[11px] text-destructive">{error}</p>}
            </div>

            <div className="flex justify-end gap-2 border-t border-border/50 bg-muted/10 px-4 py-3 sm:px-5">
              <button
                type="button"
                onClick={() => {
                  if (!busy) onClose();
                }}
                className="rounded-lg border border-border/70 bg-background px-3 py-2 text-[11px] font-medium text-foreground transition-colors hover:bg-accent/60"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy || !croppedAreaPixels}
                onClick={() => void handleApply()}
                className="rounded-lg bg-cta px-3 py-2 text-[11px] font-medium text-cta-foreground shadow-[0_1px_2px_rgba(17,24,39,0.08)] transition-opacity hover:opacity-95 disabled:opacity-50"
              >
                {busy ? "Saving…" : "Use photo"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
