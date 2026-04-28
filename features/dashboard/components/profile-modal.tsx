"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { Ban, MoreVertical, UserMinus, UserPlus, X } from "lucide-react";

const easeOut = [0, 0, 0.58, 1] as const;
const easeIn = [0.42, 0, 1, 1] as const;

export type ProfileModalUser = {
  id: string;
  name: string;
  initials: string;
  rank: number;
  hours: number;
  accentColor?: string;
};

type ProfileModalProps = {
  user: ProfileModalUser;
  onExited: () => void;
  viewerIsHost?: boolean;
};

function ActivityCalendarShell() {
  const cols = 7;
  const rows = 4;
  const total = cols * rows;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-center text-balance text-[10px] font-medium text-muted-foreground">
        Study activity
      </p>
      <div className="mx-auto w-full max-w-[280px]">
        <div className="grid w-full grid-cols-7 gap-[3px]">
          {Array.from({ length: total }, (_, i) => {
            const t = (i * 0.11) % 1;
            const opacity = 0.12 + t * 0.55;
            return (
              <div
                key={i}
                className="aspect-square rounded-[2.5px] border border-border/30 bg-cta/80"
                style={{ opacity: Math.min(0.9, opacity) }}
              />
            );
          })}
        </div>
        <p className="mt-1.5 text-pretty text-center text-[9px] text-muted-foreground/80">
          Calendar-style stats — live data next
        </p>
      </div>
    </div>
  );
}

/**
 * Renders in a portal. `open` is controlled internally so exit can finish, then
 * call `onExited` so the parent can clear selection.
 */
export default function ProfileModal({
  user,
  onExited,
  viewerIsHost = false,
}: ProfileModalProps) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();

  const requestClose = useCallback(() => {
    setOpen(false);
    setMenuOpen(false);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, requestClose]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    if (menuOpen) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  const onBackdrop = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) requestClose();
    },
    [requestClose],
  );

  if (!mounted) return null;

  const accent = user.accentColor ?? "oklch(0.62 0.06 75)";

  return createPortal(
    <AnimatePresence
      onExitComplete={() => {
        onExited();
      }}
    >
      {open && (
        <motion.div
          key="profile-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descId}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.2, ease: easeIn } }}
          onClick={onBackdrop}
        >
          <div
            className="absolute inset-0 bg-background/20 dark:bg-background/30"
            style={{
              backdropFilter: "blur(10px) saturate(1.15)",
              WebkitBackdropFilter: "blur(10px) saturate(1.15)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 65% 55% at 50% 42%, oklch(0 0 0 / 0.18) 0%, oklch(0 0 0 / 0.04) 45%, transparent 70%)",
            }}
          />

          <motion.div
            className="relative z-10 w-full max-w-md"
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.25, ease: easeOut }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="bg-[color:var(--panel-texture-bg)] bg-[image:var(--panel-texture-image)] bg-[length:200px_200px] max-h-[min(88vh,640px)] overflow-hidden rounded-2xl border border-border/60
                shadow-[0_1px_2px_rgba(17,24,39,0.06),0_16px_40px_rgba(17,24,39,0.12),inset_0_1px_0_rgba(255,255,255,0.45)]
                dark:border-border/50 dark:shadow-[0_1px_2px_rgba(0,0,0,0.3),0_20px_48px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.06)]"
            >
              <div className="max-h-[inherit] overflow-y-auto">
                <div className="flex items-start justify-between gap-2 border-b border-border/50 p-3 sm:p-4">
                  <div className="flex min-w-0 flex-1 gap-3">
                    <div
                      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-sm font-semibold text-white
                        [outline:1px_solid_rgba(0,0,0,0.1)] dark:[outline:1px_solid_rgba(255,255,255,0.1)]"
                      style={{ background: accent }}
                    >
                      {user.initials}
                    </div>
                    <div className="min-w-0 pt-0.5">
                      <h2
                        id={titleId}
                        className="text-balance text-base font-semibold leading-tight tracking-tight text-foreground"
                      >
                        {user.name}
                      </h2>
                      <p
                        id={descId}
                        className="mt-0.5 text-pretty text-[11px] text-muted-foreground"
                      >
                        Rank #{user.rank} · {user.hours.toFixed(1)}h this week
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <div className="hidden flex-col gap-1.5 sm:flex sm:flex-row sm:items-center">
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.96 }}
                        className="rounded-lg border border-border/70 bg-card/80 px-2.5 py-1.5 text-[10.5px] font-medium
                          text-foreground/90 transition-colors duration-150 hover:bg-accent/70"
                        onClick={() => {}}
                      >
                        Ping
                      </motion.button>
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.96 }}
                        className="rounded-lg border border-border/70 bg-card/80 px-2.5 py-1.5 text-[10.5px] font-medium
                          text-foreground/90 transition-colors duration-150 hover:bg-accent/70"
                        onClick={() => {}}
                      >
                        View more
                      </motion.button>
                    </div>
                    <div className="relative" ref={menuRef}>
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.96 }}
                        aria-expanded={menuOpen}
                        aria-haspopup="true"
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-border/60
                          bg-card/80 text-foreground/80 transition-colors duration-150 hover:bg-accent/70
                          focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring/50"
                        onClick={() => setMenuOpen((v) => !v)}
                      >
                        <MoreVertical size={16} strokeWidth={1.75} />
                      </motion.button>
                      {menuOpen && (
                        <div
                          className="absolute right-0 z-20 mt-1.5 w-[11.5rem] overflow-hidden rounded-xl border border-border/60
                            bg-popover/98 p-1 shadow-lg backdrop-blur-sm"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MenuItemRow
                            icon={UserPlus}
                            label="Send friend request"
                            onClick={() => setMenuOpen(false)}
                          />
                          {viewerIsHost && (
                            <MenuItemRow
                              icon={UserMinus}
                              label="Kick from room"
                              onClick={() => setMenuOpen(false)}
                              className="text-destructive/95"
                            />
                          )}
                          <MenuItemRow
                            icon={Ban}
                            label="Block"
                            onClick={() => setMenuOpen(false)}
                            className="text-destructive/95"
                          />
                        </div>
                      )}
                    </div>
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.96 }}
                      aria-label="Close profile"
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-transparent
                        text-muted-foreground transition-colors duration-150 hover:border-border/60 hover:bg-muted/60 hover:text-foreground
                        focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring/50"
                      onClick={requestClose}
                    >
                      <X size={16} strokeWidth={1.75} />
                    </motion.button>
                  </div>
                </div>
                <div className="flex flex-col gap-2 p-2 sm:hidden">
                  <div className="flex gap-1.5">
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.96 }}
                      className="flex-1 rounded-lg border border-border/70 bg-card/80 py-1.5 text-center text-[10.5px] font-medium
                        text-foreground/90"
                      onClick={() => {}}
                    >
                      Ping
                    </motion.button>
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.96 }}
                      className="flex-1 rounded-lg border border-border/70 bg-card/80 py-1.5 text-center text-[10.5px] font-medium
                        text-foreground/90"
                      onClick={() => {}}
                    >
                      View more
                    </motion.button>
                  </div>
                </div>
                <div className="border-t border-border/50 p-3 sm:p-4">
                  <ActivityCalendarShell />
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function MenuItemRow({
  icon: Icon,
  label,
  onClick,
  className = "",
}: {
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      className={
        "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-foreground/90 " +
        "hover:bg-accent/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring/40 " +
        className
      }
      onClick={onClick}
    >
      <Icon size={13} className="shrink-0 opacity-80" strokeWidth={1.6} />
      {label}
    </motion.button>
  );
}
